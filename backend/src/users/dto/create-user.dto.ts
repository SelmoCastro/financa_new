import { IsNotEmpty, IsOptional, IsString, MinLength, Matches } from 'class-validator';

export class CreateUserDto {
    @Matches(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, { message: 'Formato de e-mail inválido.' })
    @IsNotEmpty()
    email: string;

    @IsString()
    @MinLength(6)
    password: string;

    @IsString()
    @IsOptional()
    name?: string;
}
