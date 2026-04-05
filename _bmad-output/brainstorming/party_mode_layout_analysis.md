# 🥳 Party Mode [PM]: Análise de Layout & UX

**Data:** 03/04/2026  
**Participantes:** ✨ Designer, 🏗️ Arquiteto, 🚀 DevOps  
**Objetivo:** Revisar o estado atual do layout e validar o [Plano de Melhorias](file:///home/selmo/.gemini/antigravity/brain/99cee62b-763f-46e4-90ab-7121c9aa66cc/implementation_plan.md).

---

### ✨ A Visão do Designer (UI/UX)
> "O layout atual é uma base sólida, mas falta aquele 'brilho' de produto da Apple. O **Glassmorphism** está tímido; precisamos de `backdrop-blur-2xl` e uma borda de 1px com degradê sutil para dar profundidade. No mobile, o header está gritando por socorro. Tem muita informação disputando a atenção. Sugiro o `ActionMenu` para esconder o que não é essencial (Tema, Privacidade) e dar foco total ao balanço e ao botão de 'Gravar'. E sobre os cards: 2x2 no mobile é mandatório para evitar o 'infinite scroll' de estatísticas."

### 🏗️ A Visão do Arquiteto (Componentes)
> "Concordo com a limpeza do Header. Do ponto de vista de estrutura, ao criar o `ActionMenu`, devemos garantir que ele seja um componente agnóstico de estado para não poluir o `App.tsx`. Sobre o erro de 12000% na Regra 50/30/20: isso cheira a um `NaN` ou divisão por zero no `useMemo` do `DashboardView.tsx`. Precisamos encapsular esse cálculo em uma função utilitária com `Math.min(val, 100)` e tratamento de erros rigoroso. Ah, e vamos usar `staggerChildren` no Framer Motion para que os cards apareçam sequencialmente; isso dá uma percepção de performance muito maior."

### 🚀 A Visão do DevOps (Performance & Estabilidade)
> "Minha preocupação é a barra de navegação inferior. O subagente detectou scroll horizontal involuntário. Isso acontece porque estamos usando `justify-start` com `overflow-x-auto` sem um container rígido. Precisamos mudar para um Flexbox com `justify-between` e talvez esconder os labels em telas extremamente pequenas (iPhone SE). Outro ponto: se vamos aumentar o `blur` do Glassmorphism, precisamos checar o impacto no FPS em dispositivos móveis menos potentes. Recomendo usar `will-change-transform` nas animações de rota."

---

### 📝 Veredito do Conselho
O plano de melhorias está **APROVADO** com as seguintes adições:
1.  **Segurança de Dados**: Adicionar validação de tipos e guardas contra valores irreais no dashboard.
2.  **Otimização de Renderização**: Garantir que as animações não causem *layout thrashing* no mobile.
3.  **Foco em UX Mobile**: Priorizar a simplificação do header para reduzir a carga cognitiva.

> [!TIP]
> **Próximo Passo Recomendado**: Iniciar a implementação pelo `ActionMenu` e pela correção do bug dos 12000%, pois afetam diretamente a confiança do usuário no app.
