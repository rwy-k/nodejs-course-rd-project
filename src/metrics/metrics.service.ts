import { Injectable, OnModuleInit } from '@nestjs/common';
import { Counter, Registry, collectDefaultMetrics } from 'prom-client';

@Injectable()
export class MetricsService implements OnModuleInit {
  private readonly registry = new Registry();
  private readonly shipmentsCreatedTotal: Counter<string>;

  readonly contentType: string;

  constructor() {
    this.contentType = this.registry.contentType;
    this.shipmentsCreatedTotal = new Counter({
      name: 'shipments_created_total',
      help: 'Total number of shipments successfully created (persisted)',
      registers: [this.registry],
    });
  }

  onModuleInit() {
    collectDefaultMetrics({ register: this.registry });
  }

  recordShipmentCreated(): void {
    this.shipmentsCreatedTotal.inc();
  }

  async getPrometheusText(): Promise<string> {
    return this.registry.metrics();
  }
}
