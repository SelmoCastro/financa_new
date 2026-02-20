import { IsString, IsNotEmpty, IsNumber } from 'class-validator';

export class CreateCreditCardDto {
    @IsString()
    @IsNotEmpty()
    name: string;

    @IsNumber()
    @IsNotEmpty()
    limit: number;

    @IsNumber()
    @IsNotEmpty()
    closingDay: number;

    @IsNumber()
    @IsNotEmpty()
    dueDay: number;

    @IsString()
    @IsNotEmpty()
    accountId: string;
}
