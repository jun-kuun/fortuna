import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { AssetType, Currency } from '@prisma/client';

export class CreateAssetDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEnum(AssetType)
  type: AssetType;

  @IsEnum(Currency)
  currency: Currency;
}
