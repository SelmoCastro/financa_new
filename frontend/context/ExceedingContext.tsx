import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';

interface ExceedingResources {
  account: string[];
  budget: string[];
  creditCard: string[];
  goal: string[];
}

interface ExceedingContextType {
  exceeding: ExceedingResources;
  refreshExceeding: () => void;
  isExceeding: (type: keyof ExceedingResources, id: string) => boolean;
}

const defaultExceeding: ExceedingResources = {
  account: [],
  budget: [],
  creditCard: [],
  goal: [],
};

const ExceedingContext = createContext<ExceedingContextType>({
  exceeding: defaultExceeding,
  refreshExceeding: () => {},
  isExceeding: () => false,
});

export const ExceedingProvider: React.FC<{ children: React.ReactNode; userPlan: string }> = ({ children, userPlan }) => {
  const [exceeding, setExceeding] = useState<ExceedingResources>(defaultExceeding);

  const refreshExceeding = useCallback(async () => {
    if (userPlan === 'premium') {
      setExceeding(defaultExceeding);
      return;
    }
    try {
      const res = await api.get('/subscription/exceeding');
      if (res.data) {
        setExceeding(res.data);
      }
    } catch (err) {
      console.warn('Erro ao buscar recursos excedentes:', err);
    }
  }, [userPlan]);

  useEffect(() => {
    refreshExceeding();
  }, [refreshExceeding]);

  const isExceeding = useCallback((type: keyof ExceedingResources, id: string): boolean => {
    return exceeding[type]?.includes(id) ?? false;
  }, [exceeding]);

  return (
    <ExceedingContext.Provider value={{ exceeding, refreshExceeding, isExceeding }}>
      {children}
    </ExceedingContext.Provider>
  );
};

export const useExceeding = () => useContext(ExceedingContext);