export interface ImportTransactionData {
  description: string;
  amount: number;
  date: string;
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
}

export interface AiClassificationSuggestion {
  category?: string;
  c?: string; // short form from AI
  cleanName?: string;
  n?: string; // short form from AI
  rule?: number;
  r?: number; // short form from AI
  icon?: string;
  i?: string; // short form from AI
  confidence?: number;
}

export interface RawAccountRow {
  id: string;
  userId: string;
  balance: number;
  deletedAt: Date | null;
}