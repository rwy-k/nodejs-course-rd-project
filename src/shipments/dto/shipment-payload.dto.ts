import { IsNumber, IsPositive } from 'class-validator';

export class ShipmentPayloadDto {
  @IsNumber()
  @IsPositive()
  weightKg: number;

  @IsNumber()
  @IsPositive()
  lengthCm: number;

  @IsNumber()
  @IsPositive()
  widthCm: number;

  @IsNumber()
  @IsPositive()
  heightCm: number;
}
