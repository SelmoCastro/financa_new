import { useTransactionsContext } from '../context/TransactionsContext';

export const useTransactions = () => {
    return useTransactionsContext();
};
