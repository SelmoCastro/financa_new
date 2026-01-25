import { Transaction } from '../types';

export const parseVoiceCommand = (text: string): Partial<Transaction> => {
    const cleanText = text.toLowerCase();

    // 1. Extract Amount (Looks for numbers, optionally with 'reais', 'conto')
    // Regex matches: "50", "50,00", "50.00", "R$ 50"
    const amountMatch = cleanText.match(/(\d+([.,]\d{2})?)/);
    let amount = 0;
    if (amountMatch) {
        amount = parseFloat(amountMatch[0].replace(',', '.'));
    }

    // 2. Extract Category (Keyword matching)
    let category = 'Outros';
    const categoryKeywords: Record<string, string> = {
        'mercado': 'Alimentação',
        'padaria': 'Alimentação',
        'ifood': 'Alimentação',
        'restaurante': 'Alimentação',
        'lanche': 'Alimentação',
        'comida': 'Alimentação',
        'uber': 'Transporte',
        '99': 'Transporte',
        'taxi': 'Transporte',
        'onibus': 'Transporte',
        'gasolina': 'Transporte',
        'posto': 'Transporte',
        'aluguel': 'Moradia',
        'luz': 'Moradia',
        'agua': 'Moradia',
        'internet': 'Moradia',
        'condominio': 'Moradia',
        'academia': 'Saúde',
        'remedio': 'Saúde',
        'farmacia': 'Saúde',
        'medico': 'Saúde',
        'cinema': 'Lazer',
        'jogo': 'Lazer',
        'netflix': 'Lazer',
        'spotify': 'Lazer',
        'salario': 'Salário',
        'pagamento': 'Salário',
        'pix': 'Outros'
    };

    for (const [key, cat] of Object.entries(categoryKeywords)) {
        if (cleanText.includes(key)) {
            category = cat;
            break;
        }
    }

    // 3. Extract Description
    // Initial strategy: Remove the amount and generic words, capitalize, or just use full text
    // Let's use the full text but cleaned up a bit for now as "Smart Description"
    let description = text;

    // If we found a specific keyword, maybe use that as description if the text is too long? 
    // For now, let's just capitalize the first letter
    description = description.charAt(0).toUpperCase() + description.slice(1);

    // Determine Type based on Category keywords or 'gastou'/'ganhou' context
    // Default to EXPENSE unless proven otherwise
    let type: 'INCOME' | 'EXPENSE' = 'EXPENSE';
    if (cleanText.includes('ganhei') || cleanText.includes('recebi') || cleanText.includes('salário') || cleanText.includes('vendi')) {
        type = 'INCOME';
    }

    return {
        amount,
        category,
        description,
        type,
        date: new Date().toISOString()
    };
};
