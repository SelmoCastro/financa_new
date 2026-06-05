import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsBoolean,
  Min,
  Max,
  IsUUID,
  IsArray,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';

export class InstallmentValueDto {
  @IsNumber()
  @Min(0.01)
  amount: number;
}

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
  @IsOptional()
  @Min(0.01)
  entryAmount?: number; // valor da entrada (pagamento à vista)

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

  /**
   * Optional: individual amount for each installment.
   * If provided, overrides the equal-split calculation.
   * Length must match installmentCount.
   * entryAmount is ignored when installmentValues is provided.
   */
  @IsArray()
  @IsOptional()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => InstallmentValueDto)
  installmentValues?: InstallmentValueDto[];
}
