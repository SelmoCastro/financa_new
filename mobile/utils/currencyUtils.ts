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
    
    // Identifica se usa vírgula ou ponto como decimal
    // Se tiver vírgula e estiver no final (ou perto do final), provavelmente é o decimal
    const hasComma = value.includes(',');
    const hasDot = value.includes('.');

    if (hasComma && !hasDot) {
        // Formato 1000,00
        return parseFloat(value.replace(',', '.'));
    }
    if (hasDot && !hasComma) {
        // Formato 1000.00
        return parseFloat(value);
    }
    if (hasComma && hasDot) {
        // Formato 1.000,00 ou 1,000.00
        const lastComma = value.lastIndexOf(',');
        const lastDot = value.lastIndexOf('.');
        
        if (lastComma > lastDot) {
            // pt-BR: 1.000,00
            return parseFloat(value.replace(/\./g, '').replace(',', '.'));
        } else {
            // en-US: 1,000.00
            return parseFloat(value.replace(/,/g, ''));
        }
    }

    return parseFloat(value);
};
