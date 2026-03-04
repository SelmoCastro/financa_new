import { IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';
import { IsValidEmail } from '../validators/is-valid-email.validator';

export class CreateUserDto {
    @IsValidEmail()
    @IsNotEmpty()
    email: string;

    @IsString()
    @MinLength(6)
    password: string;

    @IsString()
    @IsOptional()
    name?: string;
}
