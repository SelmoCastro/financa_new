/** Parse Brazilian or US-style monetary input without losing thousands separators. */
export function parseFlexibleCurrency(value: string | number): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : NaN;

  const normalized = value.trim().replace(/\s/g, '');
  if (!normalized) return NaN;

  const lastComma = normalized.lastIndexOf(',');
  const lastDot = normalized.lastIndexOf('.');

  if (lastComma >= 0 && lastDot >= 0) {
    const decimalSeparator = lastComma > lastDot ? ',' : '.';
    const thousandsSeparator = decimalSeparator === ',' ? '.' : ',';
    return Number(
      normalized.replaceAll(thousandsSeparator, '').replace(decimalSeparator, '.'),
    );
  }

  if (lastComma >= 0) {
    const fractionLength = normalized.length - lastComma - 1;
    return Number(
      fractionLength === 3
        ? normalized.replaceAll(',', '')
        : normalized.replace(',', '.'),
    );
  }

  if (lastDot >= 0) {
    const fractionLength = normalized.length - lastDot - 1;
    return Number(
      fractionLength === 3
        ? normalized.replaceAll('.', '')
        : normalized,
    );
  }

  return Number(normalized);
}

export function formatFlexibleCurrencyInput(value: string, locale: string): string {
  const amount = parseFlexibleCurrency(value);
  if (!value.trim() || !Number.isFinite(amount)) return value;
  return amount.toLocaleString(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
