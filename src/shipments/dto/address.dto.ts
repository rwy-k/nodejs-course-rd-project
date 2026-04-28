import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class AddressDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(256)
  streetLine: string;

  @IsOptional()
  @IsString()
  @MaxLength(256)
  line2?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  city: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  postalCode: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  country: string;
}
