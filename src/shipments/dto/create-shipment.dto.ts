import { Type } from 'class-transformer';
import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { ShipmentStatus } from '../entities/shipment.entity';
import { AddressDto } from './address.dto';
import { ShipmentPayloadDto } from './shipment-payload.dto';

export class CreateShipmentDto {
  @IsString()
  @MaxLength(128)
  trackingNumber: string;

  @ValidateNested()
  @Type(() => ShipmentPayloadDto)
  payload: ShipmentPayloadDto;

  @ValidateNested()
  @Type(() => AddressDto)
  pickupAddress: AddressDto;

  @ValidateNested()
  @Type(() => AddressDto)
  deliveryAddress: AddressDto;

  @IsUUID()
  clientId: string;

  @IsOptional()
  @IsEnum(ShipmentStatus)
  status?: ShipmentStatus;
}
