export interface ImportTransactionData {
  description: string;
  amount: number;
  date: string | Date;
  type: string;
  fitId?: string;
  accountId?: string;
  categoryId?: string;
  creditCardId?: string;
  isFixed?: boolean;
  categoryLegacy?: string;
  classificationRule?: number;
  sharedWithEmail?: string;
  // Enriched fields (added during validation)
  isFuzzyDuplicate?: boolean;
  isPreviouslyRejected?: boolean;
  originalDescription?: string;
  suggestedCategory?: string;
  suggestedCategoryId?: string;
  suggestedRule?: number;
  suggestedIcon?: string;
  confidence?: number;
  // Receipt extraction fields
  cnpj?: string;
}

export interface AiSuggestion {
  category?: string;
  c?: string;
  cleanName?: string;
  n?: string;
  rule?: number;
  r?: number;
  icon?: string;
  i?: string;
  confidence?: number;
}

export interface AccountLockRow {
  id: string;
  userId: string;
  balance: string;
  deletedAt: Date | null;
}
