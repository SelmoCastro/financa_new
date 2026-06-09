/**
 * DTO usado para validar e tipar o payload de import transaction dentro do fluxo de transações financeiras.
 */
import {
  IsString,
  IsUUID,
  IsNumber,
  IsDateString,
  IsOptional,
  IsBoolean,
  IsArray,
  ArrayMaxSize,
  IsIn,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class ImportValidateTransactionDto {
  @IsString()
  @MaxLength(500)
  description: string;

  @Transform(({ value }) =>
    value !== null && value !== undefined ? Number(value) : value,
  )
  @IsNumber()
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

  @Transform(({ value }) =>
    value !== null && value !== undefined ? Number(value) : value,
  )
  @IsNumber()
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

  @Transform(({ value }) =>
    value !== null && value !== undefined ? Number(value) : value,
  )
  @IsOptional()
  classificationRule?: number;

  @IsUUID()
  @IsOptional()
  accountId?: string;

  @IsUUID()
  @IsOptional()
  creditCardId?: string;

  // Campos extras que o mobile envia do spread ...t (vindos do preview do OCR)
  @IsString()
  @IsOptional()
  cnpj?: string;

  @IsBoolean()
  @IsOptional()
  isFuzzyDuplicate?: boolean;

  @IsBoolean()
  @IsOptional()
  isPreviouslyRejected?: boolean;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  originalDescription?: string;

  @IsString()
  @IsOptional()
  suggestedCategory?: string;

  @IsUUID()
  @IsOptional()
  suggestedCategoryId?: string;

  @IsOptional()
  suggestedRule?: number;

  @IsString()
  @IsOptional()
  suggestedIcon?: string;

  @IsOptional()
  confidence?: number;

  @IsString()
  @IsOptional()
  sharedWithEmail?: string;

  // Mobile-only fields (sent via spread ...t from OCR preview)
  @IsBoolean()
  @IsOptional()
  selected?: boolean;

  @IsString()
  @IsOptional()
  id?: string;
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
