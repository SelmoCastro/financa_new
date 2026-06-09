/**
 * Tela principal do frontend para Landing; reúne estado visual, ações do usuário e composição de componentes.
 */
import { useNavigate } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { CookiePrefsLink } from '../components/CookieBanner';

const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="min-h-screen bg-[#030712] text-white selection:bg-cyan-500/30" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      {/* NAV */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-[#030712]/90 backdrop-blur-xl border-b border-white/5' : ''}`}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="Finanza AI" className="w-9 h-9 rounded-xl shadow-lg shadow-cyan-500/20 object-contain" />
            <span className="font-black text-lg tracking-tight">Finanza AI</span>
          </div>
          <div className="flex items-center gap-3">
            <a href="https://finanzaai.tech/downloads/" className="hidden sm:inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-300 hover:text-white transition-colors">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M17.523 15.341a.997.997 0 0 0 0-1.994.997.997 0 0 0 0 1.994m-11.046 0a.997.997 0 0 0 0-1.994.997.997 0 0 0 0 1.994m11.405-6.02l1.996-3.46a.416.416 0 0 0-.152-.567.416.416 0 0 0-.567.152l-2.02 3.5C15.56 8.341 13.854 7.99 12 7.99s-3.56.351-5.14.976L4.84 5.466a.416.416 0 0 0-.567-.152.416.416 0 0 0-.152.567l1.997 3.46C3.024 11.462 1.2 14.097 1.2 17.1h21.6c0-3.003-1.824-5.638-4.918-7.779"/></svg>
              App Android
            </a>
            <button onClick={() => navigate('/login')} className="px-5 py-2.5 bg-white text-black rounded-xl font-bold text-sm hover:bg-slate-200 transition-all active:scale-95">
              Entrar
            </button>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="relative pt-24 sm:pt-32 pb-12 sm:pb-20 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,#06b6d415,transparent)]" />
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-cyan-500/5 rounded-full blur-[120px]" />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center relative">
          <div className="inline-flex items-center gap-2 bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 px-3 sm:px-4 py-1.5 rounded-full text-xs sm:text-sm font-semibold mb-6 sm:mb-8">
            <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
            Inteligência artificial nas suas finanças
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-7xl font-black tracking-tight leading-[1.1] sm:leading-[1.05] mb-4 sm:mb-6">
            Suas finanças{' '}
            <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-cyan-300 bg-clip-text text-transparent animate-pulse" style={{ animationDuration: '4s' }}>
              no piloto automático
            </span>
          </h1>
          <p className="text-lg sm:text-xl text-slate-400 mb-10 max-w-xl mx-auto leading-relaxed">
            Dashboard inteligente que organiza seus gastos, cria orçamentos e te ajuda a economizar — tudo com o poder da IA.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button onClick={() => navigate('/login')} className="px-8 py-4 bg-cyan-500 hover:bg-cyan-400 text-black rounded-2xl font-black text-sm tracking-wide shadow-2xl shadow-cyan-500/25 transition-all active:scale-95 w-full sm:w-auto">
              Começar agora — grátis
            </button>
            <a href="https://finanzaai.tech/downloads/" target="_blank" rel="noopener noreferrer" className="px-8 py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl font-bold text-sm tracking-wide transition-all flex items-center justify-center gap-2 w-full sm:w-auto">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M17.523 15.341a.997.997 0 0 0 0-1.994.997.997 0 0 0 0 1.994m-11.046 0a.997.997 0 0 0 0-1.994.997.997 0 0 0 0 1.994m11.405-6.02l1.996-3.46a.416.416 0 0 0-.152-.567.416.416 0 0 0-.567.152l-2.02 3.5C15.56 8.341 13.854 7.99 12 7.99s-3.56.351-5.14.976L4.84 5.466a.416.416 0 0 0-.567-.152.416.416 0 0 0-.152.567l1.997 3.46C3.024 11.462 1.2 14.097 1.2 17.1h21.6c0-3.003-1.824-5.638-4.918-7.779"/></svg>
              Baixar App Android
            </a>
          </div>
          <p className="text-xs text-slate-600 mt-5">Sem cartão de crédito • Android 8+ • Sincronizado Web + Mobile</p>
        </div>
      </section>

      {/* WHY FINANZA */}
      <section className="py-16 border-y border-white/5">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 grid sm:grid-cols-3 gap-6 sm:gap-8 text-center">
          {[
            { emoji: '🇧🇷', title: 'Feito para brasileiros', desc: 'Categorias em português, bancos brasileiros e suporte à nossa realidade financeira.' },
            { emoji: '🔒', title: 'Seus dados são seus', desc: 'Sem rastreamento, sem venda de dados. Criptografia de ponta a ponta.' },
            { emoji: '🆓', title: 'Grátis de verdade', desc: 'Todas as funcionalidades essenciais gratuitas. Sem cartão de crédito.' },
          ].map((item) => (
            <div key={item.title}>
              <div className="text-2xl mb-3">{item.emoji}</div>
              <h3 className="font-bold text-sm mb-1">{item.title}</h3>
              <p className="text-xs text-slate-500 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section className="py-12 sm:py-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black mb-3 sm:mb-4">Tudo em um só lugar</h2>
            <p className="text-slate-400 max-w-lg mx-auto">Chega de planilhas. A Finanza AI centraliza suas contas, cartões e orçamentos com análises inteligentes.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { emoji: '📊', title: 'Dashboard em tempo real', desc: 'Receitas, despesas e saldo consolidados com gráficos que se atualizam sozinhos.' },
              { emoji: '🤖', title: 'Assistente IA', desc: 'Peça análises, tire dúvidas e receba sugestões de economia quando quiser.' },
              { emoji: '📱', title: 'Android + Web', desc: 'Mesmos dados sincronizados. Comece no celular e continue no computador.' },
              { emoji: '🎯', title: 'Orçamentos inteligentes', desc: 'Defina limites por categoria com alertas visuais e método 50/30/20 incluso.' },
              { emoji: '💳', title: 'Contas e cartões', desc: 'Gerencie múltiplas contas bancárias e acompanhe faturas de cartão de crédito.' },
              { emoji: '📥', title: 'Importação de extratos', desc: 'Importe OFX do seu banco com deduplicação automática — sem lançar manual.' },
            ].map((f) => (
              <div key={f.title} className="group bg-white/[0.02] border border-white/[0.06] hover:border-cyan-500/20 rounded-2xl p-4 sm:p-6 transition-all hover:bg-white/[0.04]">
                <div className="text-3xl mb-4">{f.emoji}</div>
                <h3 className="font-bold text-base mb-1.5 group-hover:text-cyan-400 transition-colors">{f.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="py-12 sm:py-24 bg-white/[0.01] border-y border-white/5">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <h2 className="text-3xl sm:text-4xl font-black text-center mb-16">3 passos para o <span className="text-cyan-400">controle total</span></h2>
          <div className="grid sm:grid-cols-3 gap-8">
            {[
              { step: '01', emoji: '🚀', title: 'Crie sua conta', desc: 'E-mail e senha. Sem Facebook, sem Google. 30 segundos.' },
              { step: '02', emoji: '🏦', title: 'Adicione suas contas', desc: 'Conecte bancos e cartões. Ou importe extratos OFX automaticamente.' },
              { step: '03', emoji: '📊', title: 'Acompanhe seus resultados', desc: 'Visualize gráficos, compare meses e veja para onde seu dinheiro está indo.' },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-5 shadow-lg shadow-cyan-500/20">{item.emoji}</div>
                <div className="text-xs font-black text-cyan-500 mb-2">PASSO {item.step}</div>
                <h3 className="font-bold text-lg mb-2">{item.title}</h3>
                <p className="text-sm text-slate-400">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 50/30/20 */}
      <section className="py-12 sm:py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-3xl sm:text-4xl font-black mb-4">Método <span className="text-cyan-400">50/30/20</span></h2>
          <p className="text-slate-400 mb-12 max-w-lg mx-auto">A regra mais recomendada por especialistas, já aplicada automaticamente nos seus dados.</p>
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-2xl p-5 sm:p-8">
              <div className="text-4xl font-black text-emerald-400 mb-2">50%</div>
              <div className="font-bold mb-1">Necessidades</div>
              <div className="text-xs text-slate-500">Moradia, contas, mercado, transporte</div>
            </div>
            <div className="bg-amber-500/5 border border-amber-500/10 rounded-2xl p-5 sm:p-8">
              <div className="text-4xl font-black text-amber-400 mb-2">30%</div>
              <div className="font-bold mb-1">Desejos</div>
              <div className="text-xs text-slate-500">Lazer, assinaturas, restaurantes, compras</div>
            </div>
            <div className="bg-cyan-500/5 border border-cyan-500/10 rounded-2xl p-5 sm:p-8">
              <div className="text-4xl font-black text-cyan-400 mb-2">20%</div>
              <div className="font-bold mb-1">Economia</div>
              <div className="text-xs text-slate-500">Reserva, metas, investimentos</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-12 sm:py-24">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-3xl sm:text-5xl font-black mb-4">Pronto para dominar suas finanças?</h2>
          <p className="text-slate-400 mb-10">Grátis. Sem pegadinhas. Comece em menos de 1 minuto.</p>
          <button onClick={() => navigate('/login')} className="px-10 py-4 bg-cyan-500 hover:bg-cyan-400 text-black rounded-2xl font-black text-sm tracking-wide shadow-2xl shadow-cyan-500/25 transition-all active:scale-95">
            Criar conta gratuita
          </button>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-white/5 py-6 sm:py-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="Finanza AI" className="w-7 h-7 rounded-lg object-contain opacity-50" />
            <span className="font-bold text-sm text-slate-500">Finanza AI</span>
          </div>
          <div className="flex items-center gap-6 text-xs text-slate-600">
            <a href="https://finanzaai.tech/downloads/" className="hover:text-cyan-400 transition-colors">App Android</a>
            <a href="mailto:contato@finanzaai.tech" className="hover:text-cyan-400 transition-colors">Contato</a>
            <a href="/legal/privacy.html" className="hover:text-cyan-400 transition-colors">Privacidade</a>
            <a href="/legal/terms.html" className="hover:text-cyan-400 transition-colors">Termos</a>
            <CookiePrefsLink />
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
