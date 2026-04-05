# 🧠 BMad: O Guia Definitivo do Framework Agêntico

O **BMad (Brain-Machine Agentic Design)** não é apenas um conjunto de notas; é o sistema operacional da sua colaboração com a IA no projeto **Finanza AI**. Este guia ensina como usar o BMad para ir do conceito à produção com máxima eficiência.

---

## 🛠️ O Coração do BMad: `[BH]` BMad Help

Sempre que estiver na dúvida de qual o próximo passo, digite **`[BH]`**.
O BMad analisará o estado atual do seu projeto (arquivos criados, progresso no backlog) e recomendará qual ferramenta usar para avançar com segurança.

---

## 🔍 Fase 1: Análise & Descoberta
*Entendendo o terreno antes de construir.*

Nesta fase, usamos as ferramentas para mapear o sistema e preparar o contexto para a IA.

| Ferramenta | Comando | Quando usar? | Resultado Esperado |
| :--- | :--- | :--- | :--- |
| **Index Docs** | `[ID]` | Ao entrar em uma pasta nova ou após criar muitos arquivos. | Um `index.md` atualizado com a descrição real de cada arquivo. |
| **Distillator** | `[DG]` | Antes de pedir uma refatoração complexa de um arquivo gigante. | Uma versão compacta e rica em significado do arquivo para o contexto da IA. |
| **Shard Doc** | `[SD]` | Quando um documento de requisitos ou design fica grande demais. | Divisão lógica em partes menores para evitar perda de atenção da IA. |

---

## 💡 Fase 2: Ideação & Brainstorming
*Expandindo horizontes e resolvendo bloqueios criativos.*

Transforme problemas vagos em planos de ação concretos.

1.  **Brainstorming `[BSP]`**: Digite `[BSP]` para abrir uma sessão de ideação. Foque em **divergência**: peça 10 formas diferentes de resolver um problema de UI ou backend.
2.  **Party Mode `[PM]`**: O "Conselho de Agentes". Use `[PM]` quando precisar de opiniões contrastantes. Um "Arquiteto", um "DevOps" e um "Designer" discutirão seu problema no chat.
3.  **Edge Case Hunter `[ECH]`**: Use antes de fechar um design. "Quais os casos de borda dessa nova funcionalidade de metas?"

---

## 💻 Fase 3: Implementação Agêntica
*Transformando ideias em código funcional.*

Ao implementar, você não apenas pede código, você usa os artefatos do BMad.

*   **Dica Pro:** Após um `[BSP]`, peça: *"Baseado no brainstorming em `_bmad-output/brainstorming/xxx.md`, implemente a opção 2 no componente `Dashboard.tsx`."*
*   **Fluxo Sugerido:** 
    1. Gere um plano com a IA.
    2. Valide o plano com `[AR]` (Adversarial Review).
    3. Implemente as correções sugeridas.

---

## 🛡️ Fase 4: Qualidade & Testes
*Gerantindo que nada quebre e que tudo seja seguro.*

O BMad é impiedoso com a mediocridade.

*   **Adversarial Review `[AR]`**: O "revisor chato". Sempre use `[AR]` em PRDs ou mudanças críticas de lógica. Ele encontrará falhas de segurança e lógica que você ignorou.
*   **Test Design**: Peça à IA: *"Crie um plano de testes para este código focando nos cenários listados pelo `[ECH]` (Edge Case Hunter)."*

---

## 🚀 Fase 5: Produção & Documentação
*Finalizando com brilho e mantendo o sistema explicável.*

1.  **Editorial Review `[EP]` & `[ES]`**: Antes de publicar uma documentação ou commit importante, peça `[EP]` para polir a linguagem e `[ES]` para checar a estrutura lógica.
2.  **Deploy (Vercel)**:
    *   **Backend:** Vá para `/backend`, rode `vercel`.
    *   **Frontend:** Vá para `/frontend`, rode `vercel`.
    *   *Sempre verifique as variáveis de ambiente no `README.md`.*
3.  **Mapeamento Final**: Rode `[ID] mapeia` na raiz para atualizar o `_bmad-output/index.md`.

---

## 📂 Organização de Saída
Todos os seus insights agênticos moram em:
`{project-root}/_bmad-output/`

Consulte o **[Índice de Documentação](file:///media/selmo/Extra_Disk_1/Projetos/Financa_new/_bmad-output/index.md)** para encontrar versões destiladas, revisões e brainstormings anteriores.

---
> [!IMPORTANT]
> O BMad é um multiplicador. Se você der contexto ruim, ele multiplicará o lixo. Use `[DG]` e `[ID]` para manter o "cérebro" do projeto sempre limpo e organizado.


💡 Dica: Pode referenciar com @[_bmad-output/finanza-distillate.md] em qualquer prompt para dar contexto imediato ao agente.