import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Shipment } from './entities/shipment.entity';

@Injectable()
export class ShipmentsRepository {
  constructor(
    @InjectRepository(Shipment)
    private readonly shipmentRepo: Repository<Shipment>,
  ) {}

  createEntity(partial: Partial<Shipment>): Shipment {
    return this.shipmentRepo.create(partial);
  }

  async save(entity: Shipment): Promise<Shipment> {
    return this.shipmentRepo.save(entity);
  }

  async findAll(): Promise<Shipment[]> {
    return this.shipmentRepo.find({ order: { id: 'ASC' } });
  }

  async findAllByClientId(clientId: string): Promise<Shipment[]> {
    return this.shipmentRepo.find({
      where: { clientId },
      order: { id: 'ASC' },
    });
  }

  async findById(id: string): Promise<Shipment | null> {
    return this.shipmentRepo.findOne({ where: { id } });
  }

  async findByTrackingNumber(trackingNumber: string): Promise<Shipment | null> {
    return this.shipmentRepo.findOne({ where: { trackingNumber } });
  }

  async remove(entity: Shipment): Promise<void> {
    await this.shipmentRepo.remove(entity);
  }
}
