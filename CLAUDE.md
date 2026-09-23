# CLAUDE.md — Bíblia do Projeto "Bolso"

> App web de controle de gastos pessoais. Este arquivo é a fonte da verdade.
> Claude: leia isto antes de codar qualquer coisa. Se algo aqui conflitar com um pedido no chat, **pergunte** em vez de adivinhar.

---

## 0. TL;DR pra começar rápido

- **O que é:** um app pessoal pra registrar gastos e entradas, mês a mês, com metas, objetivos de poupança, fixos, parcelas e empréstimos.
- **Dono/usuário:** Vinícius (uso individual por enquanto, mas o modelo já nasce por usuário).
- **Stack:** Next.js (App Router) + TypeScript + Tailwind + Drizzle ORM + Postgres (Neon).
- **Deploy:** Vercel + Neon — **só no final** (Fase 5). Nas fases iniciais roda local.
- **Idioma da interface:** Português (Brasil), informal e leve.
- **Mobile-first vertical:** telas de celular em pé (mais altas que largas) são a prioridade nº 1.

---

## 1. Visão

Um controle de gastos que a pessoa **realmente usa todo dia** porque é rápido de lançar e bonito de olhar. Nada de planilha intimidadora. A regra de ouro: **lançar um gasto tem que levar menos de 5 segundos.**

Princípios:

- **Leve e fluido:** transições suaves, feedback imediato, nada travado.
- **Animado, mas sóbrio:** micro-animações com propósito (um card que "conta" o número subindo, um check ao salvar). Nunca poluir.
- **Honesto com o dinheiro:** o app nunca infla o saldo. Empréstimo recebido não vira "sobra". Dinheiro guardado pra um objetivo sai do disponível.

---

## 2. Identidade visual

### Paleta (pastel)

| Uso     | Cor         | Papel                               |
| ------- | ----------- | ----------------------------------- |
| Fundo   | `#FCEFFE` | fundo geral                         |
| Lavanda | `#E0CFE8` | primária / destaques, cabeçalhos  |
| Coral   | `#FFAC81` | gastos, ações, alertas            |
| Limão  | `#E8E691` | avisos, metas chegando no limite    |
| Menta   | `#8DFFDB` | positivo, entradas, saldo saudável |

**Tinta (texto):** use um tom escuro pra contraste, ex. `#3A2E3F`. Pastel é pra preenchimento e acento, **nunca** texto claro sobre pastel (falha de leitura). Seguir contraste WCAG AA.

### Regras de UI

- **Ícones sempre.** Biblioteca: `lucide-react`. Cada categoria tem ícone + emoji.
- **Cantos arredondados** (radius 16–20px), sombras suaves.
- **Tipografia:** uma fonte só, limpa (ex. Inter). Números com destaque.
- **Modo escuro:** previsto (Fase 4), com versões escuras dos tokens.
- **Sem travessão (—) em textos da interface.** Usar vírgula ou dois pontos.

---

## 3. Responsividade (prioridade máxima)

- **Base = celular em pé.** Desenhar primeiro pra ~390px de largura, tela alta.
- Navegação principal por **barra inferior** (bottom tab), o polegar alcança.
- **Botão flutuante "+"** sempre visível pra lançar rápido.
- Cards empilham na vertical; nada de tabela larga que exige rolar pro lado no celular.
- Tablet/desktop: aproveitar o espaço (2–3 colunas), mas nunca às custas do mobile.
- Alvos de toque >= 44px.

---

## 4. Conceitos do domínio (leia com atenção)

### 4.1 Lançamento

Toda movimentação é um lançamento com `tipo`:

- **gasto** (sai dinheiro)
- **entrada** (entra dinheiro)

Campos: data, descrição, valor, categoria, forma de pagamento, observação, `recorrencia`.

### 4.2 Tipos de entrada

- 💼 Salário
- ➕ Extra / freela / hora extra
- 🎁 Doação / presente
- 🔁 Reembolso (te devolveram)
- 🤝 Empréstimo recebido (**tratado à parte, ver 4.6**)
- 📦 Outros

### 4.3 Recorrência

- **Única:** só naquele dia.
- **Fixa:** repete todo mês com valor conhecido, até ser encerrada (aluguel, internet).
- **Fixa variável:** repete todo mês na data de vencimento, mas o valor muda (luz, água, gás). Ver 4.8.
- **Por N meses (temporária):** repete por X meses. É aqui que entra a compra parcelada. Ex.: "Celular 10x R$ 150" gera parcela 1/10 ... 10/10 e some sozinha depois. Mostrar sempre "parcela X/N".

Fixos (fixa, fixa variável) e temporárias devem poder ser pausados/encerrados sem apagar o histórico.

### 4.4 Cartão de crédito

- Gasto conta **no dia da compra** (decisão v1, mais simples).
- Parcelado usa a recorrência "por N meses" (4.3).
- *Futuro (não v1):* modo "fatura" com dia de fechamento.

### 4.5 Metas por categoria

Limite mensal por categoria (ex. Lazer <= R$ 200). Barra de progresso: verde/menta, laranja/coral em 80%, vermelho ao estourar.

### 4.6 Empréstimos (o ponto delicado)

Empréstimo **não é renda**. Separar em dois saldos:

- **Saldo real** = entradas (sem empréstimo) − gastos. É o que é seu de verdade.
- **Saldo em caixa** = saldo real + empréstimos a receber − empréstimos a pagar. É o que tem na conta hoje.

Card próprio "Empréstimos": quem te deve, a quem você deve, com botão **quitado**. Ao pagar de volta, vira gasto na categoria "Pagamento de empréstimo".

### 4.7 Objetivos (caixinhas de poupança)

Ex.: "Celular novo — R$ 2.000 até dez/2026". Mostrar: guardado, falta, **quanto guardar por mês** pra bater a data, barra de progresso. Dinheiro guardado sai do disponível, mas **não** é gasto.

### 4.8 Gastos fixos variáveis

Conta que cai todo mês mas com valor diferente (luz, água, gás, telefone). Regras:

- **Repete na data de vencimento**, mas entra como ESTIMADO, não confirmado.
- **Estimativa automática:** média dos últimos 3 meses confirmados dessa conta (pega variação de estação). Sem histórico, usa o valor que o usuário digitar na criação.
- **Status do lançamento:** `estimado` até o usuário confirmar o valor real da fatura; depois vira `confirmado`.
- **Impacto no saldo:**
  - enquanto `estimado`: entra só na PREVISÃO de fim de mês, NUNCA no saldo real.
  - quando `confirmado`: entra no saldo real como gasto normal.
- **Ao confirmar:** o valor real substitui o estimado e realimenta a média dos próximos meses.
- **Na tela:** tag "estimado" e cor mais apagada; quando confirmado, mostrar a diferença vs média (ex.: "R$ 128, R$ 18 acima da média").

Campos extra em `recorrencias` pra esse tipo: `dia_vencimento`, `valor_estimado`, `meses_media` (default 3).
Campo extra em `lancamentos`: `status` (estimado|confirmado).

---

## 5. Modelo de dados (Postgres / Drizzle)

Todas as tabelas com `id`, `user_id`, `created_at`, `updated_at`. RLS por usuário quando for pro Neon.

- **usuarios** — id, nome, email (auth na Fase 5).
- **categorias** — nome, emoji, cor, tipo (gasto|entrada), ativa.
- **formas_pagamento** — nome, tipo (pix|debito|credito|dinheiro|boleto).
- **lancamentos** — data, descricao, valor, categoria_id, forma_pagamento_id, tipo (gasto|entrada), subtipo_entrada, recorrencia_id (nullable), obs.
- **recorrencias** — tipo (fixa|temporaria), valor, dia_do_mes, categoria_id, forma_pagamento_id, total_parcelas (nullable), parcela_atual, data_inicio, data_fim (nullable), ativa.
- **metas** — categoria_id, limite_mensal.
- **objetivos** — nome, emoji, valor_alvo, data_alvo, valor_guardado.
- **movimentos_objetivo** — objetivo_id, data, valor (guardar ou resgatar).
- **emprestimos** — descricao, pessoa, valor, direcao (a_receber|a_pagar), data, quitado (bool), data_quitacao.

> Regra: valores monetários em **inteiros de centavos** (evita erro de float). Formatar só na UI.

---

## 6. Cálculos-chave (deixar num módulo `lib/calculos.ts`, testável)

- **Total gasto no mês** = soma de lancamentos tipo gasto no mês.
- **Total entradas do mês** = soma tipo entrada, **excluindo** empréstimo recebido.
- **Saldo real** = entradas − gastos.
- **Saldo em caixa** = saldo real + emprestimos.a_receber_em_aberto − emprestimos.a_pagar_em_aberto.
- **Comprometido no próximo mês** = soma dos fixos ativos + parcelas que ainda vão cair.
- **Posso gastar por dia** = saldo real / dias restantes no mês.
- **Previsão fim do mês** = (gasto até hoje / dias passados) × dias do mês.
- **Progresso da meta** = gasto na categoria no mês / limite.
- **Guardar por mês (objetivo)** = (valor_alvo − guardado) / meses até data_alvo.

Cada cálculo com teste unitário. Nunca calcular direto no componente.

---

## 7. Telas

1. **Início (painel do mês):** cards de saldo real, saldo em caixa, recebido, gasto; "posso gastar por dia"; previsão; metas estourando; contas a vencer.
2. **Lançamentos:** lista do mês, filtro, busca. Botão + pra novo.
3. **Fixos & Parcelas:** o que repete, com parcela X/N e botão encerrar.
4. **Metas:** limites por categoria com barras.
5. **Objetivos:** as caixinhas de poupança.
6. **Empréstimos:** a receber e a pagar.
7. **Resumo do ano:** por mês, trimestre, semestre, ano; gráficos.
8. **Configurações:** categorias, formas de pagamento, tema, exportar, ano.

---

## 8. Funcionalidades por prioridade

**v1 (essencial, ideias 1–22 aprovadas):**
Lançar gasto/entrada rápido · recorrência fixa e temporária (parcelas) · metas · objetivos · empréstimos · saldo real vs caixa · comprometido no próximo mês · posso gastar por dia · previsão fim do mês · contas a vencer · resumo mês/trimestre/semestre/ano · gráficos (fluxo do mês, maiores vilões, por forma de pagamento, mapa de calor, por dia da semana) · assinaturas ativas · categorias com cor/ícone · modo escuro · instalar como app (PWA) · exportar Excel/PDF · backup.

**Depois (v2, ideias 23–25 + extras que dependem de backend/notificação):**
Notificações (alertas de categoria, lembrete de lançar, relatório mensal) · foto do comprovante · múltiplas contas/carteiras · contas compartilhadas · importar extrato CSV/OFX.

---

## 9. Fases e Sprints

> Cada sprint termina com algo **funcionando e testado**. Nunca deixar meia-boca pra trás.

### 🟣 Fase 1 — Fundação (roda local)

- **Sprint 1.1** Setup: Next.js + TS + Tailwind + Drizzle + Postgres local (ou Neon dev). Tokens da paleta no Tailwind. Layout base mobile com bottom tab e botão +.
- **Sprint 1.2** Modelo de dados: migrations das tabelas + seed com as categorias (cor/emoji).
- **Sprint 1.3** CRUD de lançamentos (gasto/entrada, único) + lista do mês + trocar de mês.
- **Sprint 1.4** Módulo `calculos.ts` + testes. Cards de saldo real, gasto, entrada no Início.

### 🟠 Fase 2 — O coração financeiro

- **Sprint 2.1** Recorrências fixas e temporárias (parcelas X/N), geração automática no mês.
- **Sprint 2.2** Empréstimos + saldo em caixa.
- **Sprint 2.3** Metas por categoria com barras e alertas.
- **Sprint 2.4** Objetivos (caixinhas) com "guardar por mês".

### 🟡 Fase 3 — Enxergar o dinheiro

- **Sprint 3.1** Resumo do ano: mês/trimestre/semestre/ano.
- **Sprint 3.2** Gráficos (fluxo do mês, maiores vilões, por forma de pagamento, por dia).
- **Sprint 3.3** Painel do Início completo: posso gastar/dia, previsão, comprometido, contas a vencer, assinaturas ativas, mapa de calor.

### 🟢 Fase 4 — Acabamento

- **Sprint 4.1** Modo escuro + micro-animações (Framer Motion, leve).
- **Sprint 4.2** PWA (instalar no celular, funcionar offline básico).
- **Sprint 4.3** Exportar Excel/PDF + backup.

### 🔵 Fase 5 — Nuvem (deixado pro final, de propósito)

- **Sprint 5.1** Migrar pro Neon + auth (login).
- **Sprint 5.2** Deploy na Vercel, variáveis de ambiente, RLS por usuário.
- **Sprint 5.3** Ajustes finais e publicação.

---

## 10. Como o Claude deve trabalhar (regras de ouro)

- **Uma coisa por vez.** Trabalhar sprint a sprint. Ao começar um, dizer o que vai fazer; ao terminar, o que ficou pronto.
- **Nada de over-engineering.** Código simples e legível ganha de esperto. É um app pessoal, não a NASA.
- **Sempre testar o que dá:** `calculos.ts` tem teste unitário obrigatório. Rodar build antes de dizer "pronto".
- **Commits pequenos e claros**, em português, no formato `tipo: descrição` (ex. `feat: lançamento de gasto único`).
- **Mobile primeiro, sempre.** Ao criar qualquer tela, checar em ~390px antes de tudo.
- **Dinheiro em centavos (inteiro).** Nunca float pra valor.
- **Se faltar decisão, perguntar.** Não inventar regra de negócio.
- **Sem travessão nos textos.** Português informal e direto.
- **Idioma:** todo texto de UI, commit e comentário em PT-BR.

---

## 11. Decisões já tomadas

| Tema              | Decisão                                    |
| ----------------- | ------------------------------------------- |
| Crédito à vista | conta no dia da compra                      |
| Parcelado         | recorrência temporária, parcela X/N       |
| Fixos             | opção "fixo" ou "por N meses"             |
| Empréstimo       | fora da renda, saldo real vs saldo em caixa |
| Banco             | Postgres (Neon), Drizzle ORM                |
| Valores           | inteiros em centavos                        |
| Deploy            | Vercel + Neon, só na Fase 5                |
| Usuário          | individual na v1, modelo já por usuário   |

### A confirmar

- 1ª cor da paleta (`#FCEFF` tem 5 dígitos, assumido `#FCEFFE`).
- Nome oficial do app (working name: **Bolso**).

---

## 12. Glossário rápido

- **Saldo real:** o que é seu (entradas − gastos, sem empréstimo).
- **Saldo em caixa:** o que tem na conta (saldo real ± empréstimos).
- **Comprometido:** fixos + parcelas que ainda vão cair.
- **Objetivo:** meta de poupança (caixinha).
- **Meta:** teto de gasto por categoria.
