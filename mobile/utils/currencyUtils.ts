export const formatCurrency = (value: string) => {
    // Remove tudo que não é dígito
    const digits = value.replace(/\D/g, '');

    if (!digits) return '';

    // Converte para número (considerando os últimos 2 dígitos como centavos)
    const amount = parseInt(digits) / 100;

    // Formata como moeda brasileira
    return amount.toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
};

export const parseCurrencyToNumber = (value: string) => {
    if (!value) return 0;
    // Remove pontos (milhares) e substitui vírgula por ponto (decimal)
    return parseFloat(value.replace(/\./g, '').replace(',', '.'));
};
