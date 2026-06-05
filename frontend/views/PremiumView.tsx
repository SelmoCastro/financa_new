import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { ArrowLeft, Check, Sparkles, Zap } from 'lucide-react';

const premiumFeatures = [
  'Contas bancárias ilimitadas',
  'Cartões de crédito ilimitados',
  'Orçamentos ilimitados',
  'Metas financeiras ilimitadas',
  'IA sem limites diários',
  'Suporte prioritário',
];

const plans = [
  {
    id: 'premium_monthly',
    name: 'Mensal',
    price: 'R$ 19,90',
    period: '/mês',
    duration: '1 mês',
    features: premiumFeatures,
    highlight: false,
    subtext: undefined,
  },
  {
    id: 'premium_quarterly',
    name: 'Trimestral',
    price: 'R$ 54,90',
    period: '/3 meses',
    duration: '3 meses',
    subtext: 'Economize 8%',
    features: [...premiumFeatures, 'R$ 18,30/mês'],
    highlight: false,
  },
  {
    id: 'premium_semiannual',
    name: 'Semestral',
    price: 'R$ 99,90',
    period: '/6 meses',
    duration: '6 meses',
    subtext: 'Economize 17%',
    features: [...premiumFeatures, 'R$ 16,65/mês'],
    highlight: false,
  },
  {
    id: 'premium_annual',
    name: 'Anual',
    price: 'R$ 179,90',
    period: '/ano',
    duration: '1 ano',
    subtext: 'Economize 25%',
    features: [...premiumFeatures, 'R$ 14,99/mês'],
    highlight: true,
  },
] as const;

const PremiumView: React.FC = () => {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [selectedPlan, setSelectedPlan] = useState<(typeof plans)[number]['id']>('premium_annual');
  const [loading, setLoading] = useState(false);

  const handleCheckout = async () => {
    setLoading(true);
    try {
      const response = await api.post('/payments/create-preference', {
        plan: selectedPlan,
      });

      if (response.data?.initPoint) {
        window.location.href = response.data.initPoint;
        return;
      }

      addToast('Não foi possível iniciar o checkout.', 'error');
    } catch (err: any) {
      if (err?.response?.status === 401) {
        addToast('Faça login para continuar com a assinatura.', 'error');
        navigate('/login');
        return;
      }

      const msg = err.response?.data?.message || 'Erro ao processar pagamento. Tente novamente.';
      addToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <button
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-2 text-sm font-bold text-slate-300 hover:text-white transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </button>

        <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-14">
          <div className="inline-flex items-center gap-2 bg-cyan-500/10 text-cyan-300 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider mb-4">
            <Sparkles className="w-3.5 h-3.5" />
            Escolha seu plano
          </div>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight mb-4">
            Valores do <span className="text-cyan-400">Premium</span> no web
          </h1>
          <p className="text-slate-400 text-sm sm:text-base max-w-2xl mx-auto">
            Selecione o plano que faz mais sentido para você e siga para o checkout seguro.
          </p>
          <div className="mt-4 text-xs sm:text-sm text-slate-500">
            Se já estiver logado, o pagamento abre direto. Se não, faça login primeiro.
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-5">
          {plans.map((plan) => {
            const active = selectedPlan === plan.id;
            return (
              <button
                key={plan.id}
                type="button"
                onClick={() => setSelectedPlan(plan.id)}
                className={`relative text-left rounded-3xl border-2 p-5 sm:p-6 transition-all ${
                  active
                    ? 'border-cyan-500 bg-cyan-500/10 shadow-2xl shadow-cyan-500/10'
                    : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10'
                }`}
              >
                {plan.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-cyan-500 text-slate-950 text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full">
                    Melhor valor
                  </div>
                )}

                <div className="mb-4 text-center">
                  <div className="text-lg font-black text-white mb-1">{plan.name}</div>
                  <div className="text-3xl font-black text-cyan-300">{plan.price}</div>
                  <div className="text-xs text-slate-400">{plan.period}</div>
                  {plan.subtext && (
                    <div className="mt-2 inline-flex text-[10px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-300 px-2.5 py-1 rounded-full">
                      {plan.subtext}
                    </div>
                  )}
                </div>

                <div className="space-y-2.5">
                  {plan.features.map((feature) => (
                    <div key={feature} className="flex items-start gap-2 text-xs text-slate-300">
                      <Check className="w-3.5 h-3.5 text-emerald-400 mt-0.5 flex-shrink-0" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>

                <div className={`mt-5 text-center text-xs font-black uppercase tracking-wider rounded-2xl px-3 py-2 ${active ? 'bg-cyan-500 text-slate-950' : 'bg-white/10 text-white'}`}>
                  {active ? 'Selecionado' : 'Selecionar'}
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-8 sm:mt-10 max-w-2xl mx-auto text-center">
          <button
            type="button"
            onClick={handleCheckout}
            disabled={loading}
            className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-black uppercase tracking-widest py-4 px-5 transition-all active:scale-[0.98] shadow-2xl shadow-cyan-500/20"
          >
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <span className="w-5 h-5 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin" />
                Processando...
              </span>
            ) : (
              <span className="inline-flex items-center gap-2">
                <Zap className="w-5 h-5" />
                Assinar {plans.find((p) => p.id === selectedPlan)?.name}
              </span>
            )}
          </button>
          <p className="text-[11px] sm:text-xs text-slate-500 mt-3">
            Pagamento seguro via Mercado Pago. Sem renovação automática.
          </p>
        </div>
      </div>
    </div>
  );
};

export default PremiumView;
