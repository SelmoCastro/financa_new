/**
 * Arquivo de suporte do frontend ligado a componentes reutilizáveis da interface; mantém comportamento ou tipagem reutilizável.
 */
import { Account, CreditCard, Category } from '../../types';

export interface ImportOverlayProps {
    onImportSuccess: () => void;
    onClose: () => void;
    accounts: Account[];
    creditCards: CreditCard[];
    categories: Category[];
    existingTransactions?: any[];
}

export interface ParsedTransaction {
    id: string;
    fitId?: string;
    date: string;
    description: string;
    amount: number;
    type: 'INCOME' | 'EXPENSE';
    categoryLegacy: string;
    categoryId?: string;
    classificationRule?: number;
    suggestedCategory?: string;
    suggestedCategoryId?: string;
    suggestedIcon?: string;
    selected: boolean;
    isPotentialDuplicate?: boolean;
    isPreviouslyRejected?: boolean;
    confidence?: number;
    cnpj?: string;
}

export type ImportMode = 'ofx' | 'receipt';
export type FilterMode = 'all' | 'new' | 'rejected';

export const ERROR_MESSAGES: Record<string, string> = {
    no_data_found: 'Não foi possível identificar transações neste documento. Verifique se é um comprovante financeiro válido e tente com uma imagem mais nítida.',
    unsupported_format: 'Formato não suportado pelo modelo de IA. Use JPG, PNG, WEBP ou PDF.',
    rate_limit: 'Muitas solicitações em sequência. Aguarde um momento e tente novamente.',
    api_error: 'Erro temporário no serviço de IA. Tente novamente em alguns instantes.',
    service_unavailable: 'Serviço de IA indisponível no momento. Tente novamente mais tarde.',
    unknown_error: 'Erro inesperado ao processar o documento. Tente novamente.',
};

export const OFX_ACCEPT = '.ofx,.qfx';
export const RECEIPT_ACCEPT = '.jpg,.jpeg,.png,.webp,.pdf';