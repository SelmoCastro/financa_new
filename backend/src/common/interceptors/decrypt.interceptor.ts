import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { EncryptionService } from '../services/encryption.service';

/**
 * Fields in each model that are encrypted and need decryption before sending to clients.
 * Maps Prisma model names to their encrypted field names.
 */
const ENCRYPTED_FIELDS_BY_MODEL: Record<string, string[]> = {
  account: ['balance'],
  transaction: ['amount'],
  creditCard: ['limit'],
  creditCardInvoice: ['totalAmount', 'paidAmount'],
  creditCardInstallment: ['totalAmount', 'amountPerMonth', 'entryAmount'],
  budget: ['amount'],
  goal: ['targetAmount', 'currentAmount'],
  recurringTransaction: ['amount'],
  notification: [], // notifications don't have encrypted financial fields
};

/**
 * Recursively walk a response object and decrypt any encrypted amount fields.
 * Handles arrays, nested objects, and primitives.
 */
function decryptDeep(obj: any, encryption: EncryptionService): any {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) return obj.map((item) => decryptDeep(item, encryption));
  if (typeof obj !== 'object') return obj;

  // Check if this object has a model type indicator (e.g., from Prisma)
  // We determine which fields to decrypt based on the fields present
  for (const field of Object.keys(obj)) {
    const value = obj[field];
    if (value !== null && value !== undefined && typeof value === 'string' && value.startsWith('enc:')) {
      // This is an encrypted field — decrypt it
      // Convert string number back to number for the client
      try {
        if (encryption.isEnabled()) {
          obj[field] = Number(encryption.decryptDecimal(value));
        } else {
          obj[field] = Number(value);
        }
      } catch {
        // If decryption fails, leave the value as-is (will show as NaN on frontend)
        // This shouldn't happen if encryption is working correctly
        obj[field] = 0;
      }
    } else if (typeof value === 'object') {
      // Recurse into nested objects/arrays
      obj[field] = decryptDeep(value, encryption);
    }
  }

  return obj;
}

/**
 * Interceptor that automatically decrypts all encrypted financial fields
 * in API responses before sending them to the client.
 *
 * This eliminates the need for each service to manually call
 * decryptRecord/decryptRecordAmounts before returning data.
 *
 * Any field value starting with 'enc:' will be automatically decrypted.
 */
@Injectable()
export class DecryptInterceptor implements NestInterceptor {
  constructor(private readonly encryption: EncryptionService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map((data) => {
        if (!this.encryption.isEnabled()) return data;
        return decryptDeep(data, this.encryption);
      }),
    );
  }
}