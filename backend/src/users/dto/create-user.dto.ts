import { IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';
import { IsValidEmail } from '../validators/is-valid-email.validator';

export class CreateUserDto {
    @IsValidEmail()
    @IsNotEmpty()
    email: string;

    @IsString()
    @MinLength(8, { message: 'A senha deve ter no mínimo 8 caracteres' })
    password: string;

    @IsString()
    @IsOptional()
    name?: string;
}
