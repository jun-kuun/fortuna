import { IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { AssetType, Currency } from '@prisma/client';

export class UpdateAssetDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsEnum(AssetType)
  @IsOptional()
  type?: AssetType;

  @IsEnum(Currency)
  @IsOptional()
  currency?: Currency;

  @IsString()
  @IsOptional()
  ticker?: string;
}

export class UpdateHoldingDto {
  @IsNumber()
  @IsOptional()
  @Min(0)
  quantity?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  avgCostPrice?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  currentPrice?: number;
}
