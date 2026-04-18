import { IsString, IsNotEmpty, IsNumber, Min, Max } from 'class-validator';

export class CreateCreditCardDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsNumber()
  @IsNotEmpty()
  @Min(0.01)
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

  @IsString()
  @IsNotEmpty()
  accountId: string;
}
