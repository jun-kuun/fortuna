import { IsNotEmpty, IsObject } from 'class-validator';

export class RebalanceRequestDto {
  @IsObject()
  @IsNotEmpty()
  allocations: Record<string, number>;
}
