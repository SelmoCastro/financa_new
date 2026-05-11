import React from 'react';
import { useExceeding } from '../context/ExceedingContext';

interface ReadOnlyBadgeProps {
  type: 'account' | 'budget' | 'creditCard' | 'goal';
  id: string;
}

/**
 * Mostra badge "Somente leitura" se o recurso estiver acima do limite do plano free.
 * Usar dentro de cards de contas, orçamentos, cartões e metas.
 */
export const ReadOnlyBadge: React.FC<ReadOnlyBadgeProps> = ({ type, id }) => {
  const { isExceeding } = useExceeding();

  if (!isExceeding(type, id)) return null;

  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-700">
      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
      Somente leitura
    </span>
  );
};