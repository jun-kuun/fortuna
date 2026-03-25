import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { AssetType, Currency } from '@prisma/client';

export class CreateAssetDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEnum(AssetType)
  type: AssetType;

  @IsEnum(Currency)
  currency: Currency;

  @IsString()
  @IsOptional()
  subType?: string;

  @IsString()
  @IsOptional()
  ticker?: string;

  @IsOptional()
  interestRate?: number;

  @IsOptional()
  maturityDate?: string;
}
