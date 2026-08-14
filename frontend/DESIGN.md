# DESIGN.md — Plataforma de Estudos de Engenharia de IA

## Direção

Interface dark premium, com aparência de laboratório: fundo azul-preto, superfícies elevadas discretas, acento ciano para ação e verde para conclusão. A hierarquia deve favorecer o módulo atual, não decorar a tela.

## Tokens

- Fundo: `#080b14`
- Superfície: `#101827`
- Superfície elevada: `#162235`
- Texto principal: `#f8fafc`
- Texto secundário: `#a5b4c7`
- Texto auxiliar: `#718096`
- Ação: `#22d3ee`
- Concluído: `#34d399`
- Bloqueado: `#64748b`
- Erro: `#fb7185`
- Bordas: `rgba(148, 163, 184, 0.14)`

## Tipografia

- Interface: DM Sans, system-ui, sans-serif.
- Código: JetBrains Mono, Fira Code, monospace.
- Títulos curtos, corpo com no máximo aproximadamente 80 caracteres por linha.

## Componentes

- Barra lateral de trilha com progresso geral.
- Lista de módulos com estados: concluído, atual e bloqueado.
- Painel de aula com conceito, exemplo e exercício.
- Caixa de código com botão de copiar.
- Botão “Marcar módulo como concluído”.
- Estado vazio, carregamento, erro e feedback de conclusão.

## Regras de UX

- O próximo módulo bloqueado explica o motivo.
- O módulo atual fica visualmente evidente.
- Texto curto: conceito em até três blocos antes do exemplo.
- Nunca depender só de cor: usar ícone e texto nos estados.
- Botões e alvos de toque com pelo menos 44px.
- Layout deve funcionar em 320px, 768px e desktop.
