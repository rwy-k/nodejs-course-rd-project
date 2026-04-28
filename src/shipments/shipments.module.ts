import { Module } from '@nestjs/common';
import { BullModule, getQueueToken } from '@nestjs/bullmq';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Queue } from 'bullmq';
import { AuthModule } from '../auth/auth.module';
import { CommonModule } from '../common/common.module';
import { MetricsModule } from '../metrics/metrics.module';
import { SHIPMENT_QUEUE_CLIENT } from './constants/shipment-queue-client.token';
import { SHIPMENT_PROCESSING_QUEUE } from './constants/shipment-queue.constants';
import { Shipment } from './entities/shipment.entity';
import { ShipmentProcessor } from './processors/shipment.processor';
import { ShipmentsController } from './shipments.controller';
import { ShipmentsRepository } from './shipments.repository';
import { ShipmentsService } from './shipments.service';

const bullEnabled =
  process.env.NODE_ENV !== 'test' || process.env.E2E_ENABLE_BULL === 'true';

@Module({
  imports: [
    TypeOrmModule.forFeature([Shipment]),
    AuthModule,
    CommonModule,
    MetricsModule,
    ...(bullEnabled
      ? [
          BullModule.registerQueue({
            name: SHIPMENT_PROCESSING_QUEUE,
          }),
        ]
      : []),
  ],
  controllers: [ShipmentsController],
  providers: [
    ShipmentsRepository,
    ShipmentsService,
    ...(bullEnabled
      ? [
          {
            provide: SHIPMENT_QUEUE_CLIENT,
            useFactory: (queue: Queue) => queue,
            inject: [getQueueToken(SHIPMENT_PROCESSING_QUEUE)],
          },
          ShipmentProcessor,
        ]
      : [{ provide: SHIPMENT_QUEUE_CLIENT, useValue: null }]),
  ],
  exports: [ShipmentsService, ShipmentsRepository],
})
export class ShipmentsModule {}
