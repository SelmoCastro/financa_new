/**
 * Hook useOptimisticTransactions — React 19 useOptimistic para transações do Finanza.
 *
 * Permite que novas transações apareçam instantaneamente na UI (antes do POST completar),
 * com rollback automático em caso de falha.
 *
 * Fonte: react.dev/reference/react/useOptimistic (consultado 15/jul/2026)
 */
import { useOptimistic, startTransition } from 'react';
import { Transaction } from '../types';

type OptimisticTransaction = Transaction & { pending?: boolean };

function transactionReducer(
  current: OptimisticTransaction[],
  action: { type: 'add', tx: Omit<Transaction, 'id'> } | { type: 'remove', id: string }
): OptimisticTransaction[] {
  switch (action.type) {
    case 'add':
      return [
        { ...action.tx, id: `optimistic-${Date.now()}`, pending: true } as OptimisticTransaction,
        ...current,
      ];
    case 'remove':
      return current.filter(t => t.id !== action.id);
    default:
      return current;
  }
}

export function useOptimisticTransactions(transactions: Transaction[]) {
  const [optimistic, dispatch] = useOptimistic(
    transactions as OptimisticTransaction[],
    transactionReducer
  );

  const addOptimistic = (tx: Omit<Transaction, 'id'>) => {
    startTransition(() => {
      dispatch({ type: 'add', tx });
    });
  };

  const removeOptimistic = (id: string) => {
    startTransition(() => {
      dispatch({ type: 'remove', id });
    });
  };

  return {
    optimisticTransactions: optimistic,
    addOptimistic,
    removeOptimistic,
  };
}
