import { IsString, IsNotEmpty, IsNumber, IsOptional } from 'class-validator';

export class CreateAccountDto {
    @IsString()
    @IsNotEmpty()
    name: string;

    @IsString()
    @IsNotEmpty()
    type: string;

    @IsNumber()
    @IsOptional()
    balance?: number;
}
