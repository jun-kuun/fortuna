import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsPositive,
  Min,
} from 'class-validator';
import { TransactionType } from '@prisma/client';

export class CreateTransactionDto {
  @IsString()
  @IsNotEmpty()
  assetId: string;

  @IsEnum(TransactionType)
  type: TransactionType;

  @IsNumber()
  @IsPositive({ message: '수량은 0보다 커야 합니다' })
  quantity: number;

  @IsNumber()
  @IsPositive({ message: '가격은 0보다 커야 합니다' })
  price: number;

  @IsNumber()
  @Min(0)
  fee: number;

  @IsDateString()
  date: string;

  @IsString()
  @IsOptional()
  memo?: string;
}
