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

**Cores dos gráficos:** o pastel não tem contraste pra desenhar barra e linha (ficou 1,2 a 1,8 contra 3:1). Nos gráficos usar os mesmos tons, mais escuros: coral `#D9622B` (gasto), menta `#1B8F6E` (saldo positivo), lavanda `#7B4FA8` (neutro). Validados com o validador de paleta (contraste, daltonismo e separação: tudo passa). Cartões e fundos continuam pastel.

**Tinta (texto):** use um tom escuro pra contraste, ex. `#3A2E3F`. Pastel é pra preenchimento e acento, **nunca** texto claro sobre pastel (falha de leitura). Seguir contraste WCAG AA.

### Regras de UI

- **Ícones sempre, emoji nunca** (decidido em 23/09/2026). Biblioteca: `lucide-react`. Cada categoria tem um ícone (coluna `icone`). A coluna `emoji` continua no banco, mas não aparece na tela. Objetivos também usam ícone, não emoji.
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
- 🤝 Empréstimo recebido: **não é mais lançado aqui**, vai na tela de Empréstimos (ver 4.6)
- 📦 Outros
- 🍽️ Vale alimentação (**tratado à parte, ver 4.13**)

**Salário e holerite (decidido em 23/09/2026):** o que conta no saldo é o **líquido**, o que cai na conta. Bruto e descontos (INSS, IR, plano de saúde...) podem ser detalhados no lançamento do salário **só pra consulta**: não viram lançamentos e não aparecem em gastos. Com o holerite preenchido, o valor do lançamento é sempre bruto − descontos.

### 4.3 Recorrência

- **Única:** só naquele dia.
- **Fixa:** repete todo mês com valor conhecido, até ser encerrada (aluguel, internet).
- **Fixa variável:** repete todo mês na data de vencimento, mas o valor muda (luz, água, gás). Ver 4.8.
- **Por N meses (temporária):** repete por X meses. É aqui que entra a compra parcelada. Ex.: "Celular 10x R$ 150" gera parcela 1/10 ... 10/10 e some sozinha depois. Mostrar sempre "parcela X/N".

Fixos (fixa, fixa variável) e temporárias devem poder ser pausados/encerrados sem apagar o histórico.

**Quando uma recorrência vira lançamento:** só quando a data chega (a data em que o dinheiro sai, ver 4.4 pro crédito). Antes disso ela é um **compromisso** (aparece em "próximos dias" e no disponível para gastar), mas não mexe no saldo real. Ex.: aluguel dia 10, hoje é dia 5: é compromisso; no dia 10 vira lançamento.

- **Dia que não existe no mês** (31 em fevereiro, 30 em fevereiro...): cai no **último dia do mês**.
- **Dia útil:** fixo e fixa variável podem cair no **Nº dia útil** do mês (ex. salário no 5º dia útil) ou no **último dia útil**. Dia útil = segunda a sábado (**sábado conta**, regra do Ministério do Trabalho pro pagamento de salário; dá pra desligar em cada fixo), tirando domingo e **feriados nacionais**, inclusive a Sexta-feira Santa. Feriado estadual e municipal não entram. Carnaval e Corpus Christi são ponto facultativo, não feriado nacional, então contam como dia útil.
- **"Todo mês, valor muda"** vale pra gasto e pra entrada (salário líquido que varia com hora extra e IR). Enquanto estimado, não entra no saldo real.
- **Parcelado:** o usuário digita o **valor de cada parcela** e o número de parcelas. A parcela 1 é a da compra (no crédito, segue a fatura, ver 4.4).
- **Apagou um lançamento gerado?** Ele não volta. A recorrência guarda até que mês já gerou (`gerada_ate`).

### 4.4 Cartão de crédito

Decisão revista em 23/09/2026: **toda compra no crédito segue a fatura**, à vista ou parcelada.

- Cada cartão (forma de pagamento tipo crédito) tem **dia de fechamento** e **dia de vencimento**, configurados pelo usuário.
- **Fechamento:** compra **até** o dia de fechamento entra na fatura que fecha naquele mês. Compra **depois** dele vai pra fatura do mês seguinte. Ex.: fecha dia 20, compra dia 20 entra; dia 21 já é a próxima.
- **Vencimento:** se o dia de vencimento é maior que o de fechamento, vence no mesmo mês do fechamento; senão, no mês seguinte. Ex.: fecha 20 e vence 27: fatura de setembro vence 27/09. Fecha 25 e vence 5: vence 05/10.
- **O gasto entra no mês na data do vencimento**, que é quando o dinheiro sai. O lançamento guarda as duas datas: `data_compra` (o que o usuário digitou) e `data` (o vencimento, usada em todos os cálculos).
- **Parcela N** cai no vencimento da fatura N−1 meses depois da fatura da parcela 1.
- **Cartão sem dias configurados:** conta no dia da compra, como antes.
- *Futuro (não v1):* limite do cartão, tela da fatura e pagamento da fatura como movimentação própria.

### 4.5 Metas por categoria

Limite mensal por categoria (ex. Lazer <= R$ 200). Barra de progresso: verde/menta, laranja/coral em 80%, vermelho ao estourar.

- **O que conta:** gasto confirmado da categoria no mês, pela data em que o dinheiro sai. Estimado e pago com VA não contam (mesma regra do total gasto).
- **Estados:** até 79,9% tranquilo (menta); de 80% até bater o limite, atenção (coral); **passou** do limite, estourou (vermelho). Bater exatamente o limite ainda é atenção.
- **Uma meta por categoria**, só categoria de gasto. O limite vale pra todo mês.
- **Alerta:** o Início mostra as metas em atenção ou estouradas. Notificação fica pra v2.

### 4.6 Empréstimos (o ponto delicado)

Empréstimo **não é renda**. Separar em dois saldos:

- **Saldo real** = entradas (sem empréstimo) − gastos. É o que é seu de verdade.
- **Saldo em caixa** = saldo real − o que você emprestou (em aberto) + o que você pegou emprestado (em aberto). É o que tem na conta hoje. *(Corrigido em 23/09/2026: a fórmula antiga tinha os sinais trocados. Pegou R$ 1.000, a conta tem +R$ 1.000.)*

Tela própria "Empréstimos": quem te deve, a quem você deve.

- **Registrar:** empréstimo é cadastrado **só na tela de Empréstimos**, não como lançamento. A categoria de entrada "Empréstimo recebido" foi desativada pra não ter dois lugares dizendo a mesma coisa.
- **Prazo pra devolver** (opcional, pedido em 23/09/2026): mostra "vence em X dias" ou "atrasado X dias". Não pode ser antes da data do empréstimo.
- **Em aberto num mês:** feito até o fim do mês e ainda não quitado naquela data. Mês passado mostra o caixa como era.
- **Recebi de volta** (a receber): só marca quitado. Não vira entrada.
- **Paguei** (a pagar): marca quitado e **o valor pago inteiro vira gasto** na categoria "Pagamento de empréstimo", na data do pagamento.
  - *Decisão do Vinícius em 23/09/2026, mantida mesmo sabendo da consequência:* como o empréstimo não entrou como renda, devolver o valor todo como gasto faz o saldo real e o caixa ficarem **menores que a conta de verdade** pelo valor emprestado. Ex.: tem 2.000, pega 1.000, devolve 1.000: a conta volta a 2.000, o app mostra 1.000. **Não "consertar" sem perguntar.**
- **Não vai voltar** (a receber): marca como perdido e o valor vira gasto (categoria "Outros"), porque o dinheiro saiu de vez.
- **Reabrir:** desfaz a quitação e apaga o gasto que ela tinha criado.

### 4.7 Objetivos (caixinhas de poupança)

Ex.: "Celular novo — R$ 2.000 até dez/2026". Mostrar: guardado, falta, **quanto guardar por mês** pra bater a data, barra de progresso. Dinheiro guardado sai do disponível, mas **não** é gasto.

- **Guardar e resgatar** são movimentos da caixinha: não viram lançamento, não mudam saldo real nem saldo em caixa (o dinheiro continua na conta). Só o disponível para gastar (Sprint 3.3) desconta o guardado.
- **Resgatar** não pode passar do que está guardado.
- **Guardar por mês** = falta ÷ meses cheios até o mês do alvo (set até dez = 3), arredondado pra cima. Alvo no mês atual ou já passado: guardar o que falta agora.
- **Ícone** lucide escolhido de uma lista fixa (sem emoji). Apagar o objetivo apaga o histórico dele.

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

### 4.9 Disponível para gastar

Saldo real não é o mesmo que dinheiro livre. Ter R$ 2.000 de saldo com R$ 1.500 já destinados a aluguel, parcela e objetivo não é ter R$ 2.000 pra gastar.

**Disponível para gastar = saldo real − reservado em objetivos − compromissos que ainda vão cair até o fim do mês.**

- **Reservado em objetivos:** saldo de todas as caixinhas (4.7).
- **Compromissos:** fixos, parcelas e fixas variáveis (pelo valor estimado) que ainda vão cair no mês. Sem filtro por valor: tudo que vai cair conta.
- O saldo real **não muda** ao guardar em objetivo. Só o disponível cai.
- Se der negativo, mostrar como negativo e avisar. Nunca esconder.

**Posso gastar por dia = disponível para gastar ÷ dias restantes no mês** (contando hoje). Se o disponível for zero ou negativo, mostrar "sem folga" em vez de um valor por dia. Arredonda pra baixo, pra nunca prometer centavo a mais.

Detalhes decididos na Sprint 3.3:

- **Reservado em objetivos = o que foi guardado (menos resgatado) no mês**, não o saldo total das caixinhas. O saldo real é do mês; descontar o guardado de meses anteriores contaria o mesmo dinheiro de novo.
- **Compromissos** = fixos, parcelas e fixas variáveis (pela média) que caem depois de hoje até o fim do mês + contas estimadas do mês esperando confirmação + o que você deve com prazo até o fim do mês (inclusive atrasado). Entradas futuras (salário que ainda vai cair) **não** entram: o disponível é conservador. Gastos pagos com VA ficam de fora.
- **Previsão de gasto no mês** = o que já saiu + compromissos + ritmo dos gastos **avulsos** (não recorrentes) × dias que faltam depois de hoje. A fórmula antiga (gasto até hoje ÷ dias passados × dias do mês) multiplicava o aluguel pelos dias. "Deve sobrar" = entradas que já caíram − previsão.
- **Comprometido no próximo mês** = fixos, parcelas e fixas variáveis (pela média) que vão cair nele. Só gastos.
- **Assinaturas ativas** = fixos na categoria Assinaturas que não foram encerrados.
- **Contas a vencer** = os compromissos em ordem de data (até 6 na tela).
- Disponível, posso gastar, previsão, contas a vencer e comprometido aparecem **só no mês atual**.
- **Mapa de calor** mora na tela de Gráficos, pra não pesar o Início. Escala de um tom (coral), 5 níveis pelo dia que mais gastou, validada: número do dia legível em todo tom.

### 4.10 Linha do tempo financeira

Diferencial do app: em vez de só dizer "você tem R$ X", mostrar **o que vai acontecer com esse dinheiro**.

```
HOJE
├── R$ 2.500 salário
├── R$ 120 mercado
└── R$ 80 combustível

PRÓXIMOS DIAS
├── R$ 1.250 aluguel (dia 10)
├── R$ 120 internet (dia 12)
└── R$ 150 parcela 4/10 (dia 15)

FIM DO MÊS
└── Previsão: R$ 780 disponíveis
```

- Passado e hoje: lançamentos confirmados.
- Próximos dias: fixos, parcelas e fixas variáveis (com tag "estimado") que ainda vão cair, em ordem de data.
- Fim do mês: o disponível para gastar (4.9) depois de tudo cair.
- Vive no Início, só no mês atual. Reaproveita os mesmos cálculos do disponível, sem lógica própria.
- **Substitui a lista "contas a vencer"** (seria a mesma informação duas vezes).
- **Até hoje:** os lançamentos de hoje + os 3 mais recentes do mês, com link pro resto.
- **Próximos dias:** compromissos (4.9) + **entradas previstas** (fixos de entrada que ainda vão cair). No mesmo dia, entrada vem antes do gasto.
- **Fim do mês:** o disponível; se houver entrada prevista, mostra também quanto fica se ela cair (o disponível continua sem contar com ela).

### 4.13 Vale alimentação (benefício)

VA só compra comida, então **não é dinheiro livre**. Ele tem **saldo próprio** e fica fora do saldo real, das entradas, dos gastos e do "posso gastar".

- **Recebeu o VA:** entrada na categoria "Vale alimentação" (subtipo `beneficio`). Pode ser fixo, ex. todo dia 25.
- **Pagou com o VA:** gasto com a forma de pagamento "Vale alimentação" (tipo `beneficio`).
- **Saldo do VA** = tudo que entrou de VA − tudo que foi pago com VA, acumulado (o que sobra passa pro mês seguinte).
- É uma versão mínima das carteiras da 4.11. Quando as carteiras chegarem, o VA vira uma delas.

### 4.11 Contas e transferências (v2)

Hoje o app diz **quanto** dinheiro existe, não **onde** ele está. Na v2:

- **Contas/carteiras:** Banco A, Banco B, dinheiro, carteira digital. Cada lançamento pertence a uma conta.
- **Transferência entre contas** é um tipo próprio de movimentação, **nunca** gasto + entrada. Sai de uma conta e entra na outra sem mexer em saldo real, gasto ou entrada do mês.
- Melhora empréstimos e objetivos, que passam a apontar pra uma conta.
- Vem **antes** das notificações na fila da v2.

### 4.12 Histórico de alterações (v2)

Dinheiro é dado sensível. Registrar quem mudou o quê e quando ("Gasto de R$ 80 alterado para R$ 95"), sem apagar o valor antigo. Fica pra depois da v1, mas a regra já vale: **lançamento apagado ou editado não some sem rastro** quando esse recurso chegar.

---

## 5. Modelo de dados (Postgres / Drizzle)

Todas as tabelas com `id`, `user_id`, `created_at`, `updated_at`. RLS por usuário quando for pro Neon.

- **usuarios** — id, nome, email (auth na Fase 5).
- **categorias** — nome, emoji, icone (nome do ícone lucide), cor, tipo (gasto|entrada), ativa.
- **formas_pagamento** — nome, tipo (pix|debito|credito|dinheiro|boleto|beneficio), dia_fechamento e dia_vencimento (só crédito, nullable).
- **lancamentos** — data (quando o dinheiro sai), data_compra, competencia (`YYYY-MM`, só em lançamento gerado por recorrência), descricao, valor, categoria_id, forma_pagamento_id, tipo (gasto|entrada), subtipo_entrada, recorrencia_id (nullable), parcela (nullable, o X de "parcela X/N"), status (estimado|confirmado, default confirmado), holerite (jsonb opcional: bruto e descontos), obs. subtipo_entrada ganha `beneficio`.
- **recorrencias** — tipo (fixa|fixa_variavel|temporaria), descricao, valor, dia_do_mes, categoria_id, forma_pagamento_id, total_parcelas (nullable), parcela_atual, data_inicio, data_fim (nullable), ativa, dia_vencimento, valor_estimado, meses_media (default 3), gerada_ate (`YYYY-MM`), dia_util (Nº dia útil; -1 = último; null = dia fixo), sabado_util (default true).
- **metas** — categoria_id, limite_mensal.
- **objetivos** — nome, emoji, valor_alvo, data_alvo. **Sem `valor_guardado`**: o saldo do objetivo é a soma dos movimentos, num lugar só (ver abaixo).
- **movimentos_objetivo** — objetivo_id, data, valor (positivo = guardar, negativo = resgatar). É a fonte da verdade do saldo do objetivo.
- **emprestimos** — descricao, pessoa, valor, direcao (a_receber|a_pagar), data, quitado (bool), data_quitacao, prazo (nullable), perdido (bool), lancamento_id (o gasto criado ao quitar ou perder).

> Regra: valores monetários em **inteiros de centavos** (evita erro de float). Formatar só na UI.

> Regra: **saldo de objetivo nunca é gravado, sempre calculado** pela soma dos `movimentos_objetivo`. Ex.: +300, +200, −50 = R$ 450. Evita dois lugares dizendo coisas diferentes.

> Regra: **geração de recorrência é idempotente.** Cada lançamento gerado por uma recorrência tem uma competência (`ano-mês`) e o banco impede dois lançamentos com a mesma `recorrencia_id + competência`. Assim, abrir o app no dia 11 ou dez vezes no mês nunca duplica a "Internet R$ 100 todo dia 10". Pra parcelas, o número da parcela também entra na chave.

> Preparado pro futuro (não criar agora): `contas`, `transferencias`, `faturas` (tela e pagamento) e `historico_alteracoes` (seções 4.4, 4.11 e 4.12). Os dias do cartão já moram em `formas_pagamento`. Nada do schema atual deve travar isso.

---

## 6. Cálculos-chave (deixar num módulo `lib/calculos.ts`, testável)

- **Total gasto no mês** = soma de lancamentos tipo gasto no mês, **excluindo** os pagos com vale alimentação.
- **Saldo do VA** = entradas de VA − gastos pagos com VA, acumulado até o fim do mês (ver 4.13).
- **Total entradas do mês** = soma tipo entrada, **excluindo** empréstimo recebido e vale alimentação.
- **Saldo real** = entradas − gastos.
- **Saldo em caixa** = saldo real − emprestimos.a_receber_em_aberto + emprestimos.a_pagar_em_aberto (em aberto no fim do mês visto).
- **Comprometido no próximo mês** = soma dos fixos ativos + parcelas que ainda vão cair.
- **Reservado em objetivos** = soma dos `movimentos_objetivo` do mês (ver 4.9).
- **Compromissos até o fim do mês** = fixos + parcelas + fixas variáveis (valor estimado) que ainda vão cair no mês.
- **Disponível para gastar** = saldo real − reservado em objetivos − compromissos até o fim do mês (ver 4.9).
- **Posso gastar por dia** = disponível para gastar / dias restantes no mês (contando hoje), arredondado pra baixo. Zero ou negativo vira "sem folga".
- **Previsão fim do mês** = gasto até hoje + compromissos até o fim do mês + (gasto avulso até hoje / dias passados) × dias que faltam depois de hoje (ver 4.9).
- **Progresso da meta** = gasto na categoria no mês / limite.
- **Saldo do objetivo** = soma dos movimentos desse objetivo.
- **Guardar por mês (objetivo)** = (valor_alvo − saldo do objetivo) / meses até data_alvo.
- **Linha do tempo** = lançamentos confirmados até hoje, mais o que ainda vai cair até o fim do mês, em ordem de data, fechando no disponível (ver 4.10).

Cada cálculo com teste unitário. Nunca calcular direto no componente.

---

## 7. Telas

1. **Início (painel do mês):** cards de saldo real, saldo em caixa, recebido, gasto; disponível para gastar; "posso gastar por dia"; previsão; metas estourando; contas a vencer; linha do tempo financeira.
2. **Lançamentos:** lista do mês, filtro, busca. Botão + pra novo.
3. **Fixos & Parcelas:** o que repete, com parcela X/N e botão encerrar.
4. **Metas:** limites por categoria com barras.
5. **Objetivos:** as caixinhas de poupança.
6. **Empréstimos:** a receber e a pagar.
7. **Resumo do ano:** por mês, trimestre, semestre, ano; gráficos. Mesmas regras do mês (sem estimado, empréstimo e VA). No ano corrente mostra até o mês atual e marca o período atual como "em andamento"; ano futuro não mostra nada. Inclui as 5 categorias onde mais foi dinheiro no ano.
8. **Configurações:** categorias, formas de pagamento, tema, exportar, ano.

---

## 8. Funcionalidades por prioridade

**v1 (essencial, ideias 1–22 aprovadas):**
Lançar gasto/entrada rápido · recorrência fixa e temporária (parcelas) · metas · objetivos · empréstimos · saldo real vs caixa · comprometido no próximo mês · disponível para gastar · linha do tempo financeira · posso gastar por dia · previsão fim do mês · contas a vencer · resumo mês/trimestre/semestre/ano · gráficos (fluxo do mês, maiores vilões, por forma de pagamento, mapa de calor, por dia da semana) · assinaturas ativas · categorias com cor/ícone · modo escuro · instalar como app (PWA) · exportar Excel/PDF · backup.

**Depois (v2, ideias 23–25 + extras que dependem de backend/notificação):**
Notificações (alertas de categoria, lembrete de lançar, relatório mensal) · foto do comprovante · múltiplas contas/carteiras e transferências entre contas (primeiro da fila, ver 4.11) · limite e tela da fatura do cartão (4.4) · histórico de alterações (4.12) · contas compartilhadas · importar extrato CSV/OFX.

---

## 9. Fases e Sprints

> Cada sprint termina com algo **funcionando e testado**. Nunca deixar meia-boca pra trás.

### 🟣 Fase 1 — Fundação (roda local)

- **Sprint 1.1** Setup: Next.js + TS + Tailwind + Drizzle + Postgres local (ou Neon dev). Tokens da paleta no Tailwind. Layout base mobile com bottom tab e botão +.
- **Sprint 1.2** Modelo de dados: migrations das tabelas + seed com as categorias (cor/emoji).
- **Sprint 1.3** CRUD de lançamentos (gasto/entrada, único) + lista do mês + trocar de mês.
- **Sprint 1.4** Módulo `calculos.ts` + testes. Cards de saldo real, gasto, entrada no Início.

### 🟠 Fase 2 — O coração financeiro

- **Sprint 2.1** Recorrências fixas e temporárias (parcelas X/N), geração automática no mês. **Idempotente**: adicionar competência (`ano-mês`) em `lancamentos` e índice único `recorrencia_id + competência` (+ parcela), com teste de gerar duas vezes sem duplicar.
- **Sprint 2.2** Empréstimos + saldo em caixa.
- **Sprint 2.3** Metas por categoria com barras e alertas.
- **Sprint 2.4** Objetivos (caixinhas) com "guardar por mês". Migration remove `objetivos.valor_guardado`; o saldo vem da soma dos movimentos.

### 🟡 Fase 3 — Enxergar o dinheiro

- **Sprint 3.1** Resumo do ano: mês/trimestre/semestre/ano.
- **Sprint 3.2** Gráficos (fluxo do mês, maiores vilões, por forma de pagamento, por dia).
- **Sprint 3.3** Painel do Início completo: disponível para gastar, posso gastar/dia, previsão, comprometido, contas a vencer, assinaturas ativas, mapa de calor.
- **Sprint 3.4** Linha do tempo financeira no Início (hoje, próximos dias, fim do mês), usando os mesmos cálculos do disponível.

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
| Crédito           | segue a fatura: entra no vencimento (revisto em 23/09/2026) |
| Parcelado         | recorrência temporária, parcela X/N, digita o valor da parcela |
| Geração de fixos  | só quando a data chega; antes é compromisso |
| Dia 31 em mês curto | cai no último dia do mês                  |
| Fixos             | opção "fixo" ou "por N meses"             |
| Empréstimo       | fora da renda, saldo real vs saldo em caixa |
| Saldo em caixa    | real − emprestei + devo (sinais corrigidos) |
| Devolver empréstimo | valor todo vira gasto (decisão do Vinícius, ver 4.6) |
| Banco             | Postgres (Neon), Drizzle ORM                |
| Valores           | inteiros em centavos                        |
| Deploy            | Vercel + Neon, só na Fase 5                |
| Usuário          | individual na v1, modelo já por usuário   |
| Banco local       | PGlite (Postgres embutido) até a Fase 5     |
| Componentes de UI | sem biblioteca, Tailwind puro (shadcn/ui e Vaul testados e descartados) |
| Gráficos          | Recharts                                    |
| Animações         | Framer Motion (pacote `motion`)             |
| Disponível        | saldo real − objetivos − compromissos do mês |
| Posso gastar/dia  | disponível ÷ dias restantes (não mais saldo real) |
| Saldo de objetivo | calculado pelos movimentos, nunca gravado   |
| Recorrência       | geração idempotente por competência         |
| Contas/transfer.  | v2, primeiro da fila                        |
| Linha do tempo    | v1, Sprint 3.4                              |
| Emoji             | nunca na interface, só ícone lucide         |
| Meta              | gasto confirmado sem VA; estoura só ao passar do limite |
| Objetivo          | saldo = soma dos movimentos; não mexe no saldo real nem no caixa |
| Resumo do ano     | até o mês atual, período atual "em andamento" |
| Gráficos          | uma série e uma cor por gráfico, valor escrito, tabela de apoio; mesmas regras do mês |
| Previsão do mês   | já saiu + compromissos + ritmo só dos avulsos |
| Disponível        | desconta o guardado no mês e o que ainda cai; não conta entrada futura |
| Dívida com prazo  | entra nos compromissos do mês do prazo (e atrasada também) |
| Linha do tempo    | substitui contas a vencer; mostra entradas previstas à parte |
| Salário           | líquido no saldo; holerite só pra consulta  |
| Dia útil          | seg a sáb, sem feriados nacionais           |
| Vale alimentação  | saldo próprio, fora do saldo real            |

### A confirmar

- 1ª cor da paleta (`#FCEFF` tem 5 dígitos, assumido `#FCEFFE`).
- Nome oficial do app (working name: **Bolso**).


---

## 12. Glossário rápido

- **Saldo real:** o que é seu (entradas − gastos, sem empréstimo).
- **Saldo em caixa:** o que tem na conta (saldo real − o que você emprestou + o que você pegou emprestado).
- **Comprometido:** fixos + parcelas que ainda vão cair.
- **Objetivo:** meta de poupança (caixinha).
- **Meta:** teto de gasto por categoria.
