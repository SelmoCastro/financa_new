/**
 * Normalizes a description string for deduplication comparison.
 *
 * - Trims whitespace
 * - Collapses multiple internal spaces into one
 * - Converts to uppercase for case-insensitive matching
 * - Strips diacritics/accents (NFD decomposition + remove combining marks)
 *   e.g. "SALÁRIO" → "SALARIO", "APLICAÇÃO" → "APLICACAO"
 */
export function normalizeDesc(desc: string): string {
  return desc
    .toUpperCase()
    .trim()
    .replace(/\s+/g, ' ')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}