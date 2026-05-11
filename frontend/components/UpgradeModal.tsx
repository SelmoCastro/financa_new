import React, { useState } from 'react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { Sparkles, Zap, Check, X } from 'lucide-react';

interface UpgradeModalProps {
  onClose: () => void;
  currentPlan: string;
}

const plans = [
  {
    id: 'premium_monthly',
    name: 'Mensal',
    price: 'R$ 19,90',
    period: '/mês',
    duration: '1 mês',
    features: [
      'Contas bancárias ilimitadas',
      'Cartões de crédito ilimitados',
      'Orçamentos ilimitados',
      'Metas financeiras ilimitadas',
      'IA sem limites diários',
    ],
    highlight: false,
  },
  {
    id: 'premium_quarterly',
    name: 'Trimestral',
    price: 'R$ 54,90',
    period: '/3 meses',
    duration: '3 meses',
    subtext: 'Economize 8%',
    features: [
      'Tudo do plano mensal',
      'R$ 18,30/mês',
      'Cancelamento a qualquer momento',
    ],
    highlight: false,
  },
  {
    id: 'premium_semiannual',
    name: 'Semestral',
    price: 'R$ 99,90',
    period: '/6 meses',
    duration: '6 meses',
    subtext: 'Economize 17%',
    features: [
      'Tudo do plano mensal',
      'R$ 16,65/mês',
      'Cancelamento a qualquer momento',
    ],
    highlight: false,
  },
  {
    id: 'premium_annual',
    name: 'Anual',
    price: 'R$ 179,90',
    period: '/ano',
    duration: '1 ano',
    subtext: 'Economize 25%',
    features: [
      'Tudo do plano mensal',
      'R$ 14,99/mês',
      'Acesso antecipado a novos recursos',
      'Badge de apoiador no perfil',
    ],
    highlight: true,
  },
];

const freeFeatures = [
  '1 conta bancária',
  '1 cartão de crédito',
  '3 orçamentos',
  '3 metas financeiras',
  '1 requisição de IA/dia',
];

export const UpgradeModal: React.FC<UpgradeModalProps> = ({ onClose, currentPlan }) => {
  const [selectedPlan, setSelectedPlan] = useState('premium_monthly');
  const [loading, setLoading] = useState(false);
  const { addToast } = useToast();

  const handleUpgrade = async () => {
    setLoading(true);
    try {
      const response = await api.post('/payments/create-preference', {
        plan: selectedPlan,
      });

      // Redirect to Mercado Pago checkout
      if (response.data?.initPoint) {
        window.open(response.data.initPoint, '_blank');
        addToast('Redirecionando para o checkout...', 'success');
      } else {
        addToast('Erro ao iniciar pagamento. Tente novamente.', 'error');
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Erro ao processar pagamento. Tente novamente.';
      addToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto border border-slate-200 dark:border-slate-800">
        {/* Header */}
        <div className="p-6 md:p-8 text-center border-b border-slate-200 dark:border-slate-800">
          <div className="inline-flex items-center gap-2 bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 px-4 py-1.5 rounded-full text-xs font-bold mb-4">
            <Sparkles className="w-3.5 h-3.5" />
            Plano {currentPlan === 'premium' ? 'Premium' : 'Atual'}
          </div>
          <h2 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white mb-2">
            Eleve seu Finanza
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Desbloqueie todo o potencial do seu controle financeiro
          </p>
        </div>

        {/* Current Plan Summary */}
        <div className="px-6 md:px-8 py-4 bg-slate-100 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
            Seu plano atual: <span className="text-slate-700 dark:text-slate-300">{currentPlan === 'premium' ? 'PREMIUM' : 'GRATUITO'}</span>
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
            {freeFeatures.map((f, i) => (
              <div key={i} className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-slate-500" />
                {f}
              </div>
            ))}
          </div>
        </div>

        {/* Plan Selection */}
        <div className="p-6 md:p-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {plans.map((plan) => (
              <div
                key={plan.id}
                onClick={() => setSelectedPlan(plan.id)}
                className={`relative p-5 rounded-2xl border-2 cursor-pointer transition-all ${
                  selectedPlan === plan.id
                    ? 'border-cyan-500 bg-cyan-50/50 dark:bg-cyan-500/5 shadow-lg shadow-cyan-500/10'
                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                }`}
              >
                {plan.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-cyan-600 text-white text-[10px] font-bold px-3 py-1 rounded-full">
                    MELHOR VALOR
                  </div>
                )}
                <div className="text-center mb-4">
                  <h3 className="text-lg font-black text-slate-900 dark:text-white mb-1">{plan.name}</h3>
                  <div className="text-3xl font-black text-cyan-600 dark:text-cyan-400">{plan.price}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">{plan.period}</div>
                  {plan.subtext && (
                    <div className="mt-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-full inline-block">
                      {plan.subtext}
                    </div>
                  )}
                </div>
                <ul className="space-y-2">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-400">
                      <Check className="w-3.5 h-3.5 text-emerald-500 mt-0.5 flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="mt-6">
            <button
              onClick={handleUpgrade}
              disabled={loading}
              className="w-full py-4 bg-cyan-600 hover:bg-cyan-700 text-white rounded-2xl font-black text-sm uppercase tracking-widest transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-cyan-200 dark:shadow-none"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Zap className="w-5 h-5" />
              )}
              {loading ? 'Processando...' : `Assinar ${plans.find(p => p.id === selectedPlan)?.name}`}
            </button>
            <p className="text-center text-[10px] text-slate-400 dark:text-slate-500 mt-3">
              Pagamento seguro via Mercado Pago. Cancele a qualquer momento.
            </p>
          </div>
        </div>

        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};