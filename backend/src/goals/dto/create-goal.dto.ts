import { IsNotEmpty, IsNumber, IsString, IsOptional, IsDateString } from 'class-validator';

export class CreateGoalDto {
    @IsString()
    @IsNotEmpty()
    title: string;

    @IsNumber()
    @IsNotEmpty()
    targetAmount: number;

    @IsNumber()
    @IsOptional()
    currentAmount?: number;

    @IsDateString()
    @IsOptional()
    deadline?: string;
}
