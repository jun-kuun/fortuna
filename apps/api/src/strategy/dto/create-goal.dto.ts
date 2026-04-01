import { IsNotEmpty, IsNumber, IsString, IsDateString, IsOptional, Min } from 'class-validator';

export class CreateGoalDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsNumber()
  targetAmount: number;

  @IsDateString()
  targetDate: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  monthlyInvestment?: number;
}
