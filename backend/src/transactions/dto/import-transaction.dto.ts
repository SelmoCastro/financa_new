import {
  IsString,
  IsUUID,
  IsNumber,
  IsDateString,
  IsOptional,
  IsBoolean,
  IsArray,
  ArrayMaxSize,
  Min,
  IsIn,
  Max,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ImportValidateTransactionDto {
  @IsString()
  @MaxLength(500)
  description: string;

  @IsNumber()
  @Min(0.01)
  @Max(99999999.99)
  amount: number;

  @IsDateString()
  date: Date;

  @IsString()
  @IsIn(['INCOME', 'EXPENSE', 'TRANSFER'])
  type: string;

  @IsString()
  @IsOptional()
  fitId?: string;

  @IsUUID()
  @IsOptional()
  accountId?: string;
}

export class ImportConfirmTransactionDto {
  @IsString()
  @MaxLength(500)
  description: string;

  @IsNumber()
  @Min(0.01)
  @Max(99999999.99)
  amount: number;

  @IsDateString()
  date: Date;

  @IsString()
  @IsIn(['INCOME', 'EXPENSE', 'TRANSFER'])
  type: string;

  @IsString()
  @IsOptional()
  fitId?: string;

  @IsBoolean()
  @IsOptional()
  isFixed?: boolean;

  @IsUUID()
  @IsOptional()
  categoryId?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  categoryLegacy?: string;

  @IsNumber()
  @IsOptional()
  classificationRule?: number;

  @IsUUID()
  @IsOptional()
  accountId?: string;

  @IsUUID()
  @IsOptional()
  creditCardId?: string;
}

/**
 * Payload completo de confirmação de importação.
 * Inclui as transações confirmadas + os FITIDs que o usuário rejeitou
 * na tela de revisão, para que possamos gravá-los e não mostrá-los novamente.
 */
export class ImportConfirmPayloadDto {
  @IsArray()
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => ImportConfirmTransactionDto)
  transactions: ImportConfirmTransactionDto[];

  @IsArray()
  @IsOptional()
  @ArrayMaxSize(500)
  @IsString({ each: true })
  @MaxLength(128, { each: true })
  rejectedFitIds?: string[];
}