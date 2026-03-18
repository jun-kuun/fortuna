import { IsNotEmpty, IsNumber, IsString, IsDateString } from 'class-validator';

export class CreateGoalDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsNumber()
  targetAmount: number;

  @IsDateString()
  targetDate: string;
}
