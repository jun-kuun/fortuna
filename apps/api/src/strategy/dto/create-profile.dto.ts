import { IsNotEmpty, IsObject, IsString } from 'class-validator';

export class CreateProfileDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsObject()
  @IsNotEmpty()
  allocations: Record<string, number>;
}
