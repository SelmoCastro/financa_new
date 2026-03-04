import { registerDecorator, ValidationOptions, ValidatorConstraint, ValidatorConstraintInterface } from 'class-validator';
import * as dns from 'dns';
import { promisify } from 'util';

const resolveMx = promisify(dns.resolveMx);

@ValidatorConstraint({ async: true })
export class IsValidEmailConstraint implements ValidatorConstraintInterface {
    async validate(email: string) {
        if (!email || typeof email !== 'string') return false;

        // 1. Basic regex format check
        const regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        if (!regex.test(email)) return false;

        const domain = email.split('@')[1];

        // 2. Local blacklist for obvious test domains (often used by devs/users testing)
        const blacklist = [
            'teste.com', 'teste.com.br', 'test.com', 'example.com', 'email.com',
            'a.com', 'b.com', 'c.com', 'meuemail.com', 'teste.teste'
        ];
        if (blacklist.includes(domain.toLowerCase())) {
            return false;
        }

        // 3. DNS MX Record Check (The "CPF logic" for emails)
        // Ensures the domain actually exists and has an email server configured.
        try {
            const records = await resolveMx(domain);
            return records && records.length > 0;
        } catch (e) {
            return false; // Domain does not exist or has no MX record
        }
    }

    defaultMessage() {
        return 'O e-mail informado é inválido, fictício ou o domínio não existe.';
    }
}

export function IsValidEmail(validationOptions?: ValidationOptions) {
    return function (object: Object, propertyName: string) {
        registerDecorator({
            target: object.constructor,
            propertyName: propertyName,
            options: validationOptions,
            constraints: [],
            validator: IsValidEmailConstraint,
        });
    };
}
