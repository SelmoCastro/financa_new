import { IsString, IsNotEmpty, IsNumber, IsOptional, IsBoolean, Min, Max, IsUUID } from 'class-validator';

export class CreateInstallmentDto {
  @IsString()
  @IsNotEmpty()
  description: string;

  @IsNumber()
  @IsNotEmpty()
  @Min(0.01)
  totalAmount: number;

  @IsNumber()
  @IsNotEmpty()
  @Min(1)
  @Max(99)
  installmentCount: number;

  @IsNumber()
  @IsNotEmpty()
  @Min(1)
  @Max(31)
  dueDay: number;

  @IsUUID()
  @IsOptional()
  accountId?: string;

  @IsUUID()
  @IsOptional()
  categoryId?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
