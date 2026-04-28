import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

export enum ShipmentStatus {
  CREATED = 'CREATED',
  PROCESSING = 'PROCESSING',
  READY_FOR_PICKUP = 'READY_FOR_PICKUP',
  DELIVERED = 'DELIVERED',
}

export interface ShipmentPayload {
  weightKg: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
}

export interface ShipmentAddress {
  streetLine: string;
  line2?: string;
  city: string;
  postalCode: string;
  country: string;
}

@Entity('shipments')
export class Shipment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  trackingNumber: string;

  @Column({ type: 'json' })
  payload: ShipmentPayload;

  @Column({ type: 'json' })
  pickupAddress: ShipmentAddress;

  @Column({ type: 'json' })
  deliveryAddress: ShipmentAddress;

  @Column({
    type: 'simple-enum',
    enum: ShipmentStatus,
    default: ShipmentStatus.CREATED,
  })
  status: ShipmentStatus;

  @Column('uuid')
  clientId: string;

  @Column({ type: 'json', nullable: true })
  tags: string[] | null;
}
