/**
 * Recursively converts Prisma Decimal objects to JavaScript numbers in any data structure.
 * Prisma Decimal objects serialize as {s:1, e:0, c:Array} in JSON, breaking API consumers.
 *
 * Uses duck-typing (toNumber + toString) to detect Decimals without importing
 * the runtime library directly, avoiding bundling issues.
 *
 * Usage: const safe = serializeDecimal(prismaResult);
 */
export function serializeDecimal<T>(data: T): T {
  if (data === null || data === undefined) return data;

  function isDecimalLike(value: unknown): value is {
    toNumber(): number;
    toString(): string;
  } {
    return (
      typeof value === 'object' &&
      value !== null &&
      'toNumber' in value &&
      typeof (value as { toNumber?: unknown }).toNumber === 'function' &&
      'toString' in value &&
      typeof (value as { toString?: unknown }).toString === 'function' &&
      !(value instanceof Date)
    );
  }

  // Duck-type Prisma Decimal: has toNumber() and toString()
  if (isDecimalLike(data)) {
    return Number(data) as T;
  }

  if (Array.isArray(data)) {
    return data.map((item: unknown) => serializeDecimal(item)) as unknown as T;
  }

  if (typeof data === 'object' && data.constructor === Object) {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      result[key] = serializeDecimal(value);
    }
    return result as T;
  }

  return data;
}
