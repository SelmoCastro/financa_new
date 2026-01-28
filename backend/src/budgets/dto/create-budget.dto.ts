import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class CreateBudgetDto {
    @IsString()
    @IsNotEmpty()
    category: string;

    @IsNumber()
    @IsNotEmpty()
    amount: number;
}
