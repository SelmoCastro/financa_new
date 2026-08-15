export const formatCurrencyInput = (value: string, currencyCode: string = 'BRL') => {
    // Remove tudo que não é dígito
    const digits = value.replace(/\D/g, '');

    if (!digits) return '';

    // Converte para número (considerando os últimos 2 dígitos como centavos)
    const amount = parseInt(digits) / 100;

    const locale = currencyCode === 'BRL' ? 'pt-BR' : 'en-US';

    // Formata como moeda
    return amount.toLocaleString(locale, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
};

export const parseCurrencyToNumber = (value: string) => {
    if (!value) return 0;
    const normalized = value.trim().replace(/\s/g, '');
    if (!normalized || normalized.startsWith('enc:') || normalized === 'NaN' || normalized === 'null' || normalized === 'undefined') {
        return 0;
    }

    const lastComma = normalized.lastIndexOf(',');
    const lastDot = normalized.lastIndexOf('.');

    if (lastComma >= 0 && lastDot >= 0) {
        const decimalSeparator = lastComma > lastDot ? ',' : '.';
        const thousandsSeparator = decimalSeparator === ',' ? '.' : ',';
        return Number(normalized.replaceAll(thousandsSeparator, '').replace(decimalSeparator, '.')) || 0;
    }

    if (lastComma >= 0) {
        const suffixLength = normalized.length - lastComma - 1;
        return Number(suffixLength === 3 ? normalized.replaceAll(',', '') : normalized.replace(',', '.')) || 0;
    }

    if (lastDot >= 0) {
        const suffixLength = normalized.length - lastDot - 1;
        return Number(suffixLength === 3 ? normalized.replaceAll('.', '') : normalized) || 0;
    }

    return Number(normalized) || 0;
};
