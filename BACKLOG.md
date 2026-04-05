# 📋 Backlog de Desenvolvimento - Finanza AI

Este documento centraliza as próximas grandes etapas de evolução do sistema.

## 🚀 Épico: Integração de Comprovantes via IA & Redesign Moderno (v1.2.0)

### 🟡 Parte 2: Otimização do Motor Vision (Extração de Dados)
- [ ] Refinar o prompt em `backend/src/ai/prompts.ts` para extração precisa de CNPJ, Data, Valor e Descrição.
- [ ] Implementar tratamento de erros para imagens de baixa qualidade ou formatos não suportados.
- [ ] Testar a extração com múltiplos tipos de comprovantes (PIX, TED, Cupons Fiscais, PDFs).

### 🔵 Parte 3: Interface de Revisão e Categorização Inteligente
- [ ] Finalizar o componente `ImportOverlay.tsx` para permitir edição rápida de valores extraídos pela IA.
- [ ] Implementar a lógica de "Confidence Score" (%) para destacar sugestões de categorias menos precisas.
- [ ] Integrar o sistema de "rejectedFitIds" para garantir que transações ignoradas não voltem a aparecer.

### 🔴 Parte 4: Homologação, Deploy e Testes E2E
- [ ] Realizar deploy unificado (Backend + Frontend) com o novo sistema de Dark Mode.
- [ ] Executar testes de fumaça (Smoke Tests) no fluxo: "Upload Foto -> Processamento IA -> Confirmação -> Dashboard".
- [ ] Monitorar latência e custos de processamento do OpenRouter nas primeiras 48h.

---
*Gerado automaticamente pelo Agente PM em 03/04/2026*
