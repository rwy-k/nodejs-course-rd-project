import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Queue } from 'bullmq';
import { QueryFailedError } from 'typeorm';
import { SHIPMENT_LOGISTICS_JOB_NAME } from './constants/shipment-jobs.constants';
import { SHIPMENT_QUEUE_CLIENT } from './constants/shipment-queue-client.token';
import { applyHeavyCargoTagRule } from './rules/shipment-tags.rule';
import { CreateShipmentDto } from './dto/create-shipment.dto';
import { UpdateShipmentDto } from './dto/update-shipment.dto';
import { MetricsService } from '../metrics/metrics.service';
import { UserRole } from '../users/user-role.enum';
import { Shipment, ShipmentStatus } from './entities/shipment.entity';
import { ShipmentsRepository } from './shipments.repository';
import type { ShipmentProcessorJobData } from './types/shipment-job.types';
import type { ShipmentRequester } from './types/shipment-requester.types';

@Injectable()
export class ShipmentsService {
  private readonly logger = new Logger(ShipmentsService.name);

  constructor(
    private readonly shipmentsRepository: ShipmentsRepository,
    private readonly metricsService: MetricsService,
    @Inject(SHIPMENT_QUEUE_CLIENT)
    private readonly shipmentQueue: Queue | null,
  ) {}

  async create(dto: CreateShipmentDto): Promise<Shipment> {
    const tags = applyHeavyCargoTagRule([], dto.payload.weightKg);
    const entity = this.shipmentsRepository.createEntity({
      trackingNumber: dto.trackingNumber,
      payload: dto.payload,
      pickupAddress: dto.pickupAddress,
      deliveryAddress: dto.deliveryAddress,
      clientId: dto.clientId,
      status: dto.status ?? ShipmentStatus.CREATED,
      tags,
    });
    try {
      const saved = await this.shipmentsRepository.save(entity);
      this.metricsService.recordShipmentCreated();
      if (saved.status === ShipmentStatus.CREATED) {
        if (this.shipmentQueue) {
          await this.shipmentQueue.add(SHIPMENT_LOGISTICS_JOB_NAME, {
            shipmentId: saved.id,
          } satisfies ShipmentProcessorJobData);
          this.logger.log(
            `shipment.logistics_job_enqueued shipmentId=${saved.id} jobName=${SHIPMENT_LOGISTICS_JOB_NAME}`,
          );
        } else {
          this.logger.warn(
            `shipment.logistics_job_skipped_no_queue shipmentId=${saved.id}`,
          );
        }
      }
      return saved;
    } catch (err) {
      if (this.isUniqueViolation(err)) {
        throw new ConflictException(
          `Shipment with tracking number "${dto.trackingNumber}" already exists`,
        );
      }
      throw err;
    }
  }

  async findAll(requester: ShipmentRequester): Promise<Shipment[]> {
    if (requester.role === UserRole.CLIENT) {
      return this.shipmentsRepository.findAllByClientId(requester.userId);
    }
    return this.shipmentsRepository.findAll();
  }

  async findOne(id: string, requester: ShipmentRequester): Promise<Shipment> {
    const shipment = await this.shipmentsRepository.findById(id);
    if (!shipment) {
      throw new NotFoundException(`Shipment ${id} not found`);
    }
    this.assertShipmentAccess(shipment, requester);
    return shipment;
  }

  async update(
    id: string,
    dto: UpdateShipmentDto,
    requester: ShipmentRequester,
  ): Promise<Shipment> {
    const shipment = await this.findOne(id, requester);
    if (dto.trackingNumber !== undefined) {
      shipment.trackingNumber = dto.trackingNumber;
    }
    if (dto.payload !== undefined) {
      shipment.payload = dto.payload;
    }
    if (dto.pickupAddress !== undefined) {
      shipment.pickupAddress = dto.pickupAddress;
    }
    if (dto.deliveryAddress !== undefined) {
      shipment.deliveryAddress = dto.deliveryAddress;
    }
    if (dto.clientId !== undefined) {
      if (
        requester.role === UserRole.CLIENT &&
        dto.clientId !== requester.userId
      ) {
        throw new ForbiddenException(
          'clientId cannot be changed to another user',
        );
      }
      shipment.clientId = dto.clientId;
    }
    if (dto.status !== undefined) {
      shipment.status = dto.status;
    }
    shipment.tags = applyHeavyCargoTagRule(
      shipment.tags ?? [],
      shipment.payload.weightKg,
    );
    try {
      return await this.shipmentsRepository.save(shipment);
    } catch (err) {
      if (this.isUniqueViolation(err)) {
        throw new ConflictException(
          `Shipment with tracking number "${dto.trackingNumber}" already exists`,
        );
      }
      throw err;
    }
  }

  async remove(id: string, requester: ShipmentRequester): Promise<void> {
    const shipment = await this.findOne(id, requester);
    await this.shipmentsRepository.remove(shipment);
  }

  private assertShipmentAccess(
    shipment: Shipment,
    requester: ShipmentRequester,
  ): void {
    if (
      requester.role === UserRole.CLIENT &&
      shipment.clientId !== requester.userId
    ) {
      throw new NotFoundException(`Shipment ${shipment.id} not found`);
    }
  }

  private isUniqueViolation(err: unknown): boolean {
    if (err instanceof QueryFailedError) {
      const driver = err.driverError as { code?: string } | undefined;
      if (driver?.code === '23505') {
        return true;
      }
      if (
        typeof err.message === 'string' &&
        err.message.includes('SQLITE_CONSTRAINT')
      ) {
        return true;
      }
    }
    return false;
  }
}
