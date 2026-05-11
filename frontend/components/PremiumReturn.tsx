import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { CheckCircle, XCircle, Clock } from 'lucide-react';

const PremiumReturn: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const path = location.pathname;

  const isSuccess = path.includes('/premium/success');
  const isFailure = path.includes('/premium/failure');
  // pending

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate('/dashboard');
    }, 5000);
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl p-8 md:p-12 max-w-md w-full text-center border border-slate-200 dark:border-slate-800">
        {isSuccess && (
          <>
            <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white mb-2">
              Pagamento aprovado!
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
              Seu plano Premium está sendo ativado. Você já pode aproveitar todos os recursos ilimitados!
            </p>
          </>
        )}

        {isFailure && (
          <>
            <div className="w-16 h-16 bg-red-100 dark:bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
            </div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white mb-2">
              Pagamento recusado
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
              Não foi possível processar seu pagamento. Tente novamente com outro método.
            </p>
          </>
        )}

        {!isSuccess && !isFailure && (
          <>
            <div className="w-16 h-16 bg-amber-100 dark:bg-amber-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Clock className="w-8 h-8 text-amber-600 dark:text-amber-400" />
            </div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white mb-2">
              Pagamento pendente
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
              Seu pagamento está sendo processado. Assim que for confirmado, seu plano será ativado automaticamente.
            </p>
          </>
        )}

        <button
          onClick={() => navigate('/dashboard')}
          className="w-full py-3 bg-cyan-600 hover:bg-cyan-700 text-white rounded-2xl font-bold text-sm transition-all"
        >
          Ir para o Dashboard
        </button>
        <p className="mt-3 text-[10px] text-slate-400 dark:text-slate-500">
          Redirecionamento automático em 5 segundos...
        </p>
      </div>
    </div>
  );
};

export default PremiumReturn;