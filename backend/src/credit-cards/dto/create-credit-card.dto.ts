import { IsString, IsUUID, IsNotEmpty, IsNumber, Min, Max, MaxLength } from 'class-validator';

export class CreateCreditCardDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @IsNumber()
  @IsNotEmpty()
  @Min(0.01)
  @Max(99999999.99)
  limit: number;

  @IsNumber()
  @IsNotEmpty()
  @Min(1)
  @Max(31)
  closingDay: number;

  @IsNumber()
  @IsNotEmpty()
  @Min(1)
  @Max(31)
  dueDay: number;

  @IsUUID()
  @IsNotEmpty()
  accountId: string;
}
