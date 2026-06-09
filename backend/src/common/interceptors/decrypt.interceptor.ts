/**
 * Interceptor compartilhado do backend; transforma ou enriquece a resposta/requisição de forma transversal.
 */
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
 * Recursively walk a response object and decrypt any encrypted amount fields.
 * Handles arrays, nested objects, and primitives.
 */
function decryptDeep(value: unknown, encryption: EncryptionService): unknown {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) {
    return value.map((item) => decryptDeep(item, encryption));
  }
  if (typeof value !== 'object') return value;

  // Check if this object has a model type indicator (e.g., from Prisma)
  // We determine which fields to decrypt based on the fields present
  const record = value as Record<string, unknown>;

  for (const field of Object.keys(record)) {
    const fieldValue = record[field];
    if (
      fieldValue !== null &&
      fieldValue !== undefined &&
      typeof fieldValue === 'string' &&
      fieldValue.startsWith('enc:')
    ) {
      // This is an encrypted field — decrypt it
      // Convert string number back to number for the client
      try {
        if (encryption.isEnabled()) {
          record[field] = Number(encryption.decryptDecimal(fieldValue));
        } else {
          record[field] = Number(fieldValue);
        }
      } catch {
        // If decryption fails, leave the value as-is (will show as NaN on frontend)
        // This shouldn't happen if encryption is working correctly
        record[field] = 0;
      }
    } else if (typeof fieldValue === 'object') {
      // Recurse into nested objects/arrays
      record[field] = decryptDeep(fieldValue, encryption);
    }
  }

  return record;
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
export class DecryptInterceptor implements NestInterceptor<unknown, unknown> {
  constructor(private readonly encryption: EncryptionService) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler<unknown>,
  ): Observable<unknown> {
    return next.handle().pipe(
      map((data: unknown) => {
        if (!this.encryption.isEnabled()) return data;
        return decryptDeep(data, this.encryption);
      }),
    );
  }
}
