import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { SHIPMENT_PROCESSING_QUEUE } from '../constants/shipment-queue.constants';
import { ShipmentStatus } from '../entities/shipment.entity';
import { ShipmentsRepository } from '../shipments.repository';
import type { ShipmentProcessorJobData } from '../types/shipment-job.types';

function randomLogisticsDelayMs(): number {
  const minMs = 5000;
  const maxMs = 10000;
  return minMs + Math.floor(Math.random() * (maxMs - minMs + 1));
}

function logisticsDelayMs(): number {
  const raw = process.env.E2E_SHIPMENT_PROCESSING_DELAY_MS;
  if (raw !== undefined && raw !== '') {
    const n = parseInt(raw, 10);
    if (!Number.isNaN(n)) {
      return n;
    }
  }
  return randomLogisticsDelayMs();
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

@Processor(SHIPMENT_PROCESSING_QUEUE)
export class ShipmentProcessor extends WorkerHost {
  private readonly logger = new Logger(ShipmentProcessor.name);

  constructor(private readonly shipmentsRepository: ShipmentsRepository) {
    super();
  }

  async process(job: Job<ShipmentProcessorJobData>): Promise<void> {
    const { shipmentId } = job.data;
    const initial = await this.shipmentsRepository.findById(shipmentId);
    if (!initial || initial.status !== ShipmentStatus.CREATED) {
      this.logger.log(
        `shipment.logistics_job_noop shipmentId=${shipmentId} reason=${!initial ? 'not_found' : 'status_not_created'} status=${initial?.status ?? 'n/a'} jobId=${String(job.id)}`,
      );
      return;
    }
    await delay(logisticsDelayMs());
    const latest = await this.shipmentsRepository.findById(shipmentId);
    if (!latest || latest.status !== ShipmentStatus.CREATED) {
      this.logger.log(
        `shipment.logistics_job_noop_after_delay shipmentId=${shipmentId} reason=${!latest ? 'not_found' : 'status_changed'} status=${latest?.status ?? 'n/a'} jobId=${String(job.id)}`,
      );
      return;
    }
    latest.status = ShipmentStatus.READY_FOR_PICKUP;
    await this.shipmentsRepository.save(latest);
    this.logger.log(
      `shipment.status_ready_for_pickup shipmentId=${shipmentId} jobId=${String(job.id)}`,
    );
  }
}
