import React, { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';

export type AppLanguage = 'pt-BR' | 'en';

type TranslationParams = Record<string, string | number>;

type LanguageContextType = {
  language: AppLanguage;
  setLanguage: (language: AppLanguage) => Promise<void>;
  locale: string;
  t: (key: string, params?: TranslationParams) => string;
};

const STORAGE_KEY = 'app_language';

const translations: Record<AppLanguage, Record<string, string>> = {
  'pt-BR': {
    'tabs.home': 'Home',
    'tabs.accounts': 'Contas',
    'tabs.recurring': 'Fixo/Recorr.',
    'tabs.transactions': 'Extrato',
    'tabs.budgets': 'Orç.',
    'tabs.goals': 'Metas',
    'tabs.reports': 'Relat.',

    'settings.title': 'Configurações',
    'settings.preferences': '🌐 Preferências',
    'settings.currency': 'Moeda',
    'settings.language': 'Idioma',
    'settings.language.pt': 'Português',
    'settings.language.en': 'Inglês',
    'settings.preferences.helper': 'A moeda define o símbolo/valor. O idioma define os textos e o formato de datas e números.',
    'settings.displayName': '👤 Nome de Exibição',
    'settings.appearance': '🎨 Aparência',
    'settings.appearance.system': 'Sistema',
    'settings.appearance.light': 'Claro',
    'settings.appearance.dark': 'Escuro',
    'settings.appearance.systemHelper': 'Acompanha automaticamente o tema do seu celular.',
    'settings.appearance.manualHelper': 'Tema {{theme}} aplicado manualmente.',
    'settings.appearance.manualHelper.dark': 'escuro',
    'settings.appearance.manualHelper.light': 'claro',
    'settings.email': '✉️ E-mail',
    'settings.password': '🔒 Senha',
    'settings.plan': '👑 Plano Atual',
    'settings.deleteAccount': '🗑️ Excluir Conta',
    'settings.logout': 'Sair da Conta',
    'settings.change': 'Alterar',
    'settings.cancel': 'Cancelar',
    'settings.confirm': 'Confirmar',
    'settings.save': 'Salvar',
    'settings.currentPassword': 'Senha atual',
    'settings.newPassword': 'Nova senha (mín. 8 caracteres)',
    'settings.confirmPassword': 'Confirmar nova senha',
    'settings.passwordButton': 'Alterar senha de acesso',
    'settings.newEmail': 'Novo e-mail',
    'settings.yourPassword': 'Sua senha',
    'settings.namePlaceholder': 'Seu nome',
    'settings.passwordMismatch': 'As senhas não coincidem',
    'settings.passwordTooShort': 'A nova senha deve ter pelo menos 8 caracteres',
    'settings.success': 'Sucesso',
    'settings.error': 'Erro',
    'settings.nameUpdated': 'Nome atualizado!',
    'settings.passwordUpdated': 'Senha alterada com sucesso!',
    'settings.emailUpdated': 'E-mail alterado! Verifique seu novo endereço.',
    'settings.themeError': 'Não foi possível salvar sua preferência de tema.',
    'settings.deleteWarning': 'Ação irreversível — todos os dados serão perdidos',
    'settings.delete': 'Excluir',
    'settings.deleteIrreversible': '⚠️ Esta ação é irreversível!',
    'settings.deletePasswordPlaceholder': 'Digite sua senha',
    'settings.deleteConfirmPlaceholder': 'Digite EXCLUIR para confirmar',
    'settings.deletePermanent': 'Excluir Permanentemente',
    'settings.deleteTypeConfirm': 'Digite EXCLUIR para confirmar',
    'settings.freePlan': 'Gratuito',
    'settings.premiumPlan': 'Premium',
    'settings.freePlanDesc': '1 pedido de IA/dia, 1 conta, 1 cartão, 3 orçamentos, 3 metas',
    'settings.premiumPlanDesc': 'IA ilimitada, contas e orçamentos sem limite',

    'accounts.title': 'Contas e Cartões',
    'accounts.subtitle': 'Gerencie seu saldo e faturas',
    'accounts.balance': 'Saldo Consolidado',
    'accounts.pending': 'Pendente',
    'accounts.freeLimit': 'Limite do plano Free',
    'accounts.freeLimitDesc': 'Você já usa a 1 conta incluída no Free. Para criar mais contas, faça upgrade.',
    'accounts.upgrade': 'Upgrade',
    'accounts.yourAccounts': 'Suas Contas',
    'accounts.noAccounts': 'Nenhuma conta. Toque para adicionar.',
    'accounts.readOnly': 'Somente leitura',
    'accounts.edit': 'Editar',
    'accounts.delete': 'Excluir',
    'accounts.creditCards': 'Cartões de Crédito',
    'accounts.noCards': 'Nenhum cartão. Toque para adicionar.',
    'accounts.dueDay': 'Vence dia {{day}}',
    'accounts.limit': 'Limite',

    'dashboard.welcomeBack': 'Bem-vindo de volta,',
    'dashboard.title': 'Resumo Financeiro',
    'dashboard.quickAdd': 'Lançamento',
    'dashboard.quickImport': 'Importar (IA)',
    'dashboard.pendingSyncTitle': '{{count}} lançamento{{plural}} aguardando sincronização',
    'dashboard.pendingSyncSubtitle.idle': 'Toque para sincronizar agora',
    'dashboard.pendingSyncSubtitle.syncing': 'Sincronizando...',
    'dashboard.availableMonth': 'Disponível (Mês)',
    'dashboard.currentBalance': 'Saldo Atual',
    'dashboard.monthIncome': 'Entradas (Mês)',
    'dashboard.monthExpense': 'Saídas (Mês)',
    'dashboard.noRecordsTitle': 'Nenhum registro este mês',
    'dashboard.noRecordsSubtitle': 'Seu fluxo de caixa aparecerá aqui. Adicione seu primeiro lançamento!',
    'dashboard.financialHealth': 'Saúde Financeira',
    'dashboard.rule503020': 'Regra 50/30/20',
    'dashboard.rule.needs': 'Necessidades (50%)',
    'dashboard.rule.wants': 'Desejos (30%)',
    'dashboard.rule.savings': 'Objetivos (20%)',
    'dashboard.rule.other': 'Outros',
    'dashboard.rule.uncategorized': 'Categorias não classificadas na regra',
    'dashboard.fixedPending': 'Fixos Pendentes',
    'dashboard.allPaidTitle': 'Tudo pago!',
    'dashboard.allPaidSubtitle': 'Você está em dia com suas contas fixas.',
    'dashboard.topExpenses': 'Top Gastos do Mês',
    'dashboard.noHighExpenseTitle': 'Nenhum gasto alto',
    'dashboard.noHighExpenseSubtitle': 'Seus gastos estão sob controle este mês.',
    'dashboard.sync.successTitle': 'Sincronizado',
    'dashboard.sync.successBody': '{{count}} lançamento{{plural}} enviado{{sentPlural}} com sucesso!',
    'dashboard.sync.errorTitle': 'Erro ao sincronizar',
    'dashboard.sync.attentionTitle': 'Atenção',
    'dashboard.sync.remainingBody': '{{count}} lançamento{{plural}} ainda não puderam ser sincronizados. Tente novamente em alguns instantes.',
    'dashboard.sync.connectionError': 'Não foi possível sincronizar agora. Verifique sua conexão.',
    'dashboard.sync.unknownError': 'Erro desconhecido',
    'dashboard.sync.defaultDescription': 'lançamento',

    'monthSelector.cancel': 'Cancelar',

    'offline.title': 'Sem internet',
    'offline.subtitle': 'Exibindo dados salvos',
    'offline.lastChanged': 'última mudança {{time}}',
  },
  en: {
    'tabs.home': 'Home',
    'tabs.accounts': 'Accounts',
    'tabs.recurring': 'Recurring',
    'tabs.transactions': 'History',
    'tabs.budgets': 'Budgets',
    'tabs.goals': 'Goals',
    'tabs.reports': 'Reports',

    'settings.title': 'Settings',
    'settings.preferences': '🌐 Preferences',
    'settings.currency': 'Currency',
    'settings.language': 'Language',
    'settings.language.pt': 'Portuguese',
    'settings.language.en': 'English',
    'settings.preferences.helper': 'Currency defines the symbol/amount. Language defines texts plus date and number formatting.',
    'settings.displayName': '👤 Display Name',
    'settings.appearance': '🎨 Appearance',
    'settings.appearance.system': 'System',
    'settings.appearance.light': 'Light',
    'settings.appearance.dark': 'Dark',
    'settings.appearance.systemHelper': 'Follows your phone theme automatically.',
    'settings.appearance.manualHelper': '{{theme}} theme applied manually.',
    'settings.appearance.manualHelper.dark': 'Dark',
    'settings.appearance.manualHelper.light': 'Light',
    'settings.email': '✉️ Email',
    'settings.password': '🔒 Password',
    'settings.plan': '👑 Current Plan',
    'settings.deleteAccount': '🗑️ Delete Account',
    'settings.logout': 'Sign Out',
    'settings.change': 'Change',
    'settings.cancel': 'Cancel',
    'settings.confirm': 'Confirm',
    'settings.save': 'Save',
    'settings.currentPassword': 'Current password',
    'settings.newPassword': 'New password (min. 8 characters)',
    'settings.confirmPassword': 'Confirm new password',
    'settings.passwordButton': 'Change access password',
    'settings.newEmail': 'New email',
    'settings.yourPassword': 'Your password',
    'settings.namePlaceholder': 'Your name',
    'settings.passwordMismatch': 'Passwords do not match',
    'settings.passwordTooShort': 'The new password must be at least 8 characters long',
    'settings.success': 'Success',
    'settings.error': 'Error',
    'settings.nameUpdated': 'Name updated!',
    'settings.passwordUpdated': 'Password changed successfully!',
    'settings.emailUpdated': 'Email changed! Check your new address.',
    'settings.themeError': 'Could not save your theme preference.',
    'settings.deleteWarning': 'Irreversible action — all data will be lost',
    'settings.delete': 'Delete',
    'settings.deleteIrreversible': '⚠️ This action is irreversible!',
    'settings.deletePasswordPlaceholder': 'Enter your password',
    'settings.deleteConfirmPlaceholder': 'Type DELETE to confirm',
    'settings.deletePermanent': 'Delete Permanently',
    'settings.deleteTypeConfirm': 'Type DELETE to confirm',
    'settings.freePlan': 'Free',
    'settings.premiumPlan': 'Premium',
    'settings.freePlanDesc': '1 AI request/day, 1 account, 1 card, 3 budgets, 3 goals',
    'settings.premiumPlanDesc': 'Unlimited AI, unlimited accounts and budgets',

    'accounts.title': 'Accounts & Cards',
    'accounts.subtitle': 'Manage your balance and bills',
    'accounts.balance': 'Consolidated Balance',
    'accounts.pending': 'Pending',
    'accounts.freeLimit': 'Free plan limit',
    'accounts.freeLimitDesc': 'You are already using the 1 account included in Free. Upgrade to create more accounts.',
    'accounts.upgrade': 'Upgrade',
    'accounts.yourAccounts': 'Your Accounts',
    'accounts.noAccounts': 'No accounts yet. Tap to add one.',
    'accounts.readOnly': 'Read only',
    'accounts.edit': 'Edit',
    'accounts.delete': 'Delete',
    'accounts.creditCards': 'Credit Cards',
    'accounts.noCards': 'No cards yet. Tap to add one.',
    'accounts.dueDay': 'Due on day {{day}}',
    'accounts.limit': 'Limit',

    'dashboard.welcomeBack': 'Welcome back,',
    'dashboard.title': 'Financial Summary',
    'dashboard.quickAdd': 'Entry',
    'dashboard.quickImport': 'Import (AI)',
    'dashboard.pendingSyncTitle': '{{count}} entr{{plural}} waiting for sync',
    'dashboard.pendingSyncSubtitle.idle': 'Tap to sync now',
    'dashboard.pendingSyncSubtitle.syncing': 'Syncing...',
    'dashboard.availableMonth': 'Available (Month)',
    'dashboard.currentBalance': 'Current Balance',
    'dashboard.monthIncome': 'Income (Month)',
    'dashboard.monthExpense': 'Expenses (Month)',
    'dashboard.noRecordsTitle': 'No records this month',
    'dashboard.noRecordsSubtitle': 'Your cash flow will appear here. Add your first entry!',
    'dashboard.financialHealth': 'Financial Health',
    'dashboard.rule503020': '50/30/20 Rule',
    'dashboard.rule.needs': 'Needs (50%)',
    'dashboard.rule.wants': 'Wants (30%)',
    'dashboard.rule.savings': 'Goals (20%)',
    'dashboard.rule.other': 'Other',
    'dashboard.rule.uncategorized': 'Categories not classified in the rule',
    'dashboard.fixedPending': 'Pending Fixed Items',
    'dashboard.allPaidTitle': 'All paid!',
    'dashboard.allPaidSubtitle': 'You are up to date with your fixed bills.',
    'dashboard.topExpenses': 'Top Expenses of the Month',
    'dashboard.noHighExpenseTitle': 'No high expenses',
    'dashboard.noHighExpenseSubtitle': 'Your spending is under control this month.',
    'dashboard.sync.successTitle': 'Synced',
    'dashboard.sync.successBody': '{{count}} entr{{plural}} sent successfully!',
    'dashboard.sync.errorTitle': 'Sync error',
    'dashboard.sync.attentionTitle': 'Attention',
    'dashboard.sync.remainingBody': '{{count}} entr{{plural}} could not be synced yet. Try again in a moment.',
    'dashboard.sync.connectionError': 'Could not sync right now. Check your connection.',
    'dashboard.sync.unknownError': 'Unknown error',
    'dashboard.sync.defaultDescription': 'entry',

    'monthSelector.cancel': 'Cancel',

    'offline.title': 'Offline',
    'offline.subtitle': 'Showing saved data',
    'offline.lastChanged': 'last change {{time}}',
  },
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

function interpolate(template: string, params?: TranslationParams): string {
  if (!params) return template;
  return Object.entries(params).reduce(
    (acc, [key, value]) => acc.replaceAll(`{{${key}}}`, String(value)),
    template,
  );
}

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<AppLanguage>('pt-BR');

  useEffect(() => {
    async function loadStoredLanguage() {
      try {
        const storedLanguage = await SecureStore.getItemAsync(STORAGE_KEY);
        if (storedLanguage === 'pt-BR' || storedLanguage === 'en') {
          setLanguageState(storedLanguage);
        }
      } catch (error) {
        console.error('[LanguageContext] Erro ao carregar idioma:', error);
      }
    }
    loadStoredLanguage();
  }, []);

  const setLanguage = async (newLanguage: AppLanguage) => {
    try {
      setLanguageState(newLanguage);
      await SecureStore.setItemAsync(STORAGE_KEY, newLanguage);
    } catch (error) {
      console.error('[LanguageContext] Erro ao salvar idioma:', error);
    }
  };

  const locale = useMemo(() => (language === 'en' ? 'en-US' : 'pt-BR'), [language]);

  const t = (key: string, params?: TranslationParams) => {
    const fallback = translations['pt-BR'][key] ?? key;
    const translated = translations[language][key] ?? fallback;
    return interpolate(translated, params);
  };

  const value = useMemo(
    () => ({ language, setLanguage, locale, t }),
    [language, locale],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
