/**
 * Máscara de entrada usada pelo formulário de Conta.
 * Cada dígito digitado representa um centavo:
 * 1 -> 0,01; 100 -> 1,00; 350000 -> 3.500,00.
 */
export function formatCurrencyInput(value: string, locale: string): string {
  const digits = value.replace(/\D/g, '');
  if (!digits) return '';

  const amount = parseInt(digits, 10) / 100;
  return amount.toLocaleString(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
