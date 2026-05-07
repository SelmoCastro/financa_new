import { useNavigate } from 'react-router-dom';
import { LayoutDashboard, Sparkles, Smartphone, Target, CreditCard, Import } from 'lucide-react';

const LandingPage: React.FC = () => {
    const navigate = useNavigate();

    const features = [
        {
            icon: LayoutDashboard,
            title: 'Dashboard Inteligente',
            desc: 'Visualize receitas, despesas e saldo em tempo real com gráficos claros e objetivos.',
        },
        {
            icon: Sparkles,
            title: 'IA Financeira',
            desc: 'Assistente virtual que analisa seus gastos, sugere economias e responde suas dúvidas.',
        },
        {
            icon: Smartphone,
            title: 'Android + Web',
            desc: 'Acesse de qualquer dispositivo. Dados sincronizados entre celular e computador.',
        },
        {
            icon: Target,
            title: 'Orçamentos & Metas',
            desc: 'Defina limites por categoria e crie metas de economia com acompanhamento visual.',
        },
        {
            icon: CreditCard,
            title: 'Contas & Cartões',
            desc: 'Gerencie contas bancárias, cartões de crédito e faturas em um só lugar.',
        },
        {
            icon: Import,
            title: 'Importação OFX',
            desc: 'Importe extratos bancários automaticamente com deduplicação inteligente.',
        },
    ];

    return (
        <div className="min-h-screen bg-slate-950 text-white">
            {/* JSON-LD Structured Data */}
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify({
                        '@context': 'https://schema.org',
                        '@type': 'SoftwareApplication',
                        name: 'Finanza AI',
                        applicationCategory: 'FinanceApplication',
                        operatingSystem: 'Android, Web',
                        description: 'Gerencie suas finanças pessoais com inteligência artificial. Dashboard, orçamentos, metas e IA financeira.',
                        url: 'https://finanzaai.tech',
                        offers: {
                            '@type': 'Offer',
                            price: '0',
                            priceCurrency: 'BRL',
                        },
                        aggregateRating: {
                            '@type': 'AggregateRating',
                            ratingValue: '4.8',
                            ratingCount: '150',
                        },
                    }),
                }}
            />

            {/* Hero */}
            <section className="relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-600/20 via-blue-600/10 to-transparent" />
                <div className="max-w-6xl mx-auto px-6 pt-20 pb-16 relative">
                    <header className="flex items-center justify-between mb-16">
                        <div className="flex items-center gap-3">
                            <img src="/logo.png" alt="Finanza AI" className="w-10 h-10 rounded-xl shadow-lg shadow-cyan-500/30 object-contain" />
                            <span className="font-bold text-xl tracking-tight">Finanza AI</span>
                        </div>
                        <button
                            onClick={() => navigate('/login')}
                            className="px-6 py-2.5 bg-white/10 hover:bg-white/20 rounded-xl font-bold text-sm border border-white/10 transition-all"
                        >
                            Entrar
                        </button>
                    </header>

                    <div className="text-center max-w-3xl mx-auto">
                        <div className="inline-flex items-center gap-2 bg-cyan-500/10 text-cyan-400 px-4 py-2 rounded-full text-sm font-bold mb-6 border border-cyan-500/20">
                            <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                            Gestão financeira com inteligência artificial
                        </div>
                        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight mb-6 leading-[1.1]">
                            Suas finanças,{' '}
                            <span className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                                simplificadas
                            </span>{' '}
                            por IA
                        </h1>
                        <p className="text-lg text-slate-400 mb-10 max-w-xl mx-auto leading-relaxed">
                            Controle gastos, crie orçamentos e alcance suas metas financeiras. 
                            O assistente IA analisa seus dados e dá sugestões personalizadas.
                        </p>
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                            <a
                                href="https://finanzaai.tech/downloads/"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-8 py-4 bg-cyan-600 hover:bg-cyan-700 rounded-2xl font-black text-sm tracking-wider shadow-2xl shadow-cyan-600/30 transition-all active:scale-95 flex items-center gap-3"
                            >
                                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M17.523 15.341a.997.997 0 0 0 0-1.994.997.997 0 0 0 0 1.994m-11.046 0a.997.997 0 0 0 0-1.994.997.997 0 0 0 0 1.994m11.405-6.02l1.996-3.46a.416.416 0 0 0-.152-.567.416.416 0 0 0-.567.152l-2.02 3.5C15.56 8.341 13.854 7.99 12 7.99s-3.56.351-5.14.976L4.84 5.466a.416.416 0 0 0-.567-.152.416.416 0 0 0-.152.567l1.997 3.46C3.024 11.462 1.2 14.097 1.2 17.1h21.6c0-3.003-1.824-5.638-4.918-7.779" />
                                </svg>
                                Baixar App Android
                            </a>
                            <button
                                onClick={() => navigate('/login')}
                                className="px-8 py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl font-bold text-sm tracking-wider transition-all"
                            >
                                Usar no navegador →
                            </button>
                        </div>
                        <p className="text-xs text-slate-500 mt-4">
                            Grátis para começar • Android 8+ • Sem cartão de crédito
                        </p>
                    </div>
                </div>
            </section>

            {/* Features */}
            <section className="py-20 bg-slate-900/50">
                <div className="max-w-6xl mx-auto px-6">
                    <div className="text-center mb-14">
                        <h2 className="text-3xl font-black mb-4">
                            Tudo que você precisa para{' '}
                            <span className="text-cyan-400">controlar seu dinheiro</span>
                        </h2>
                        <p className="text-slate-400 max-w-lg mx-auto">
                            Ferramentas simples e poderosas para organizar receitas, despesas e planejar o futuro.
                        </p>
                    </div>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {features.map((f, i) => (
                            <div
                                key={i}
                                className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 hover:border-cyan-500/30 transition-colors"
                            >
                                <div className="p-3 bg-cyan-500/10 rounded-xl w-fit mb-4">
                                    <f.icon className="w-8 h-8 text-cyan-400" />
                                </div>
                                <h3 className="font-bold text-lg mb-2">{f.title}</h3>
                                <p className="text-sm text-slate-400 leading-relaxed">{f.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* How it works */}
            <section className="py-20">
                <div className="max-w-4xl mx-auto px-6">
                    <h2 className="text-3xl font-black text-center mb-14">
                        Comece em <span className="text-cyan-400">3 passos</span>
                    </h2>
                    {[
                        { step: '1', title: 'Crie sua conta', desc: 'Cadastro rápido com e-mail. Sem facebook, sem google.' },
                        { step: '2', title: 'Adicione suas contas', desc: 'Cadastre contas bancárias e cartões de crédito.' },
                        { step: '3', title: 'Deixe a IA trabalhar', desc: 'O assistente analisa seus dados e sugere ações.' },
                    ].map((item, i) => (
                        <div key={i} className="flex items-start gap-6 mb-8 last:mb-0">
                            <div className="w-12 h-12 bg-cyan-600 rounded-2xl flex items-center justify-center font-black text-lg shrink-0 shadow-lg shadow-cyan-600/30">
                                {item.step}
                            </div>
                            <div>
                                <h3 className="font-bold text-lg mb-1">{item.title}</h3>
                                <p className="text-slate-400 text-sm">{item.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* 50/30/20 */}
            <section className="py-20 bg-slate-900/50">
                <div className="max-w-4xl mx-auto px-6 text-center">
                    <h2 className="text-3xl font-black mb-4">
                        Método <span className="text-cyan-400">50/30/20</span>
                    </h2>
                    <p className="text-slate-400 mb-10 max-w-lg mx-auto">
                        A regra financeira mais recomendada por especialistas. A Finanza AI aplica automaticamente:
                    </p>
                    <div className="grid sm:grid-cols-3 gap-6">
                        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-6">
                            <div className="text-3xl font-black text-emerald-400 mb-1">50%</div>
                            <div className="font-bold mb-1">Necessidades</div>
                            <div className="text-xs text-slate-400">Aluguel, alimentação, transporte, contas</div>
                        </div>
                        <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-6">
                            <div className="text-3xl font-black text-amber-400 mb-1">30%</div>
                            <div className="font-bold mb-1">Desejos</div>
                            <div className="text-xs text-slate-400">Lazer, restaurantes, compras, assinaturas</div>
                        </div>
                        <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-2xl p-6">
                            <div className="text-3xl font-black text-cyan-400 mb-1">20%</div>
                            <div className="font-bold mb-1">Economia</div>
                            <div className="text-xs text-slate-400">Reserva, investimentos, metas financeiras</div>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="py-20">
                <div className="max-w-3xl mx-auto px-6 text-center">
                    <h2 className="text-3xl font-black mb-4">
                        Comece a organizar suas finanças agora
                    </h2>
                    <p className="text-slate-400 mb-10">
                        Junte-se a milhares de brasileiros que já controlam seu dinheiro com a Finanza AI.
                    </p>
                    <button
                        onClick={() => navigate('/login')}
                        className="px-10 py-4 bg-cyan-600 hover:bg-cyan-700 rounded-2xl font-black text-sm tracking-wider shadow-2xl shadow-cyan-600/30 transition-all active:scale-95"
                    >
                        Criar conta gratuita
                    </button>
                </div>
            </section>

            {/* Footer */}
            <footer className="border-t border-slate-800 py-10">
                <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <img src="/logo.png" alt="Finanza AI" className="w-8 h-8 rounded-lg object-contain" />
                        <span className="font-bold text-sm">Finanza AI</span>
                        <span className="text-slate-600 text-xs">© {new Date().getFullYear()}</span>
                    </div>
                    <div className="flex items-center gap-6 text-xs text-slate-500">
                        <span>finanzaai.tech</span>
                        <a href="mailto:contato@finanzaai.tech" className="hover:text-cyan-400 transition-colors">
                            contato@finanzaai.tech
                        </a>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default LandingPage;