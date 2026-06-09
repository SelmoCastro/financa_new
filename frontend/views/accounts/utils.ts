/**
 * Arquivo de apoio da camada de views; define tipos, hooks ou utilitários usados pelas telas principais.
 */
export function formatMonth(month: number): string {
  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  return months[month - 1] || '';
}