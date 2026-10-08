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
- **Modo escuro** (feito na Sprint 4.1): segue o sistema por padrão; dá pra fixar Claro ou Escuro em Mais (cookie `bolso-tema`, a página já vem no tema certo). Os tokens têm versões escuras em `globals.css`, conferidas: texto claro >= 4.5:1 em todos os fundos de destaque; marcas dos gráficos >= 3:1 nos dois temas (o roxo troca por `#9B72C9` no escuro). Ícone em cima da cor pastel da categoria fica sempre escuro (`.sobre-pastel`).
- **Micro-animações** (Framer Motion, pacote `motion`): números que contam nos cartões do Início, check animado depois de salvar (`?salvo=` na URL, some sozinho), barras de meta e objetivo enchendo. Quem pede "reduzir movimento" no celular vê tudo parado.
- **Sem travessão (—) em textos da interface.** Usar vírgula ou dois pontos.

---

## 3. Responsividade (prioridade máxima)

- **Base = celular em pé.** Desenhar primeiro pra ~390px de largura, tela alta.
- Navegação principal por **barra inferior** (bottom tab), o polegar alcança.
- **Botão flutuante "+"** só no Início e em Lançamentos (revisto em 07/10/2026: nas outras telas cobria valores), e some enquanto a tela rola pra baixo.
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
- **Saldo em caixa** = saldo real − o que você emprestou (em aberto) + o que você pegou emprestado (em aberto). É o que tem na conta hoje. **Desde 1.5.1 não aparece mais na tela** (decisão do Vinícius em 07/10/2026): o dinheiro nos bancos é o "Nas contas hoje" (4.11) e dois números parecidos confundiam. O cálculo continua em `calculos.ts`. *(Corrigido em 23/09/2026: a fórmula antiga tinha os sinais trocados. Pegou R$ 1.000, a conta tem +R$ 1.000.)*

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

**Revisto em 08/10/2026 (1.6.6, pedido do Vinícius):** com os saldos dos bancos informados, o Disponível parte do **dinheiro nos bancos**: nas contas hoje (sem VA) − o que falta pagar no mês − **tudo** que está guardado nos objetivos (está no banco, mas já tem destino). Mostra por dia e por semana até o dia 31 (semana nunca passa do livre). A **previsão** vira o **ritmo**: média do dia a dia dos últimos 30 dias (gasto confirmado, sem VA, sem o que é conta pela regra de Pagamentos) × dias que faltam; diz se dá até o fim do mês (e quanto sobra) ou o dia em que acaba. Sem saldos informados, vale a regra antiga abaixo.

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

### 4.14 Pagamentos do mês (Sprint 6.1, pedido em 07/10/2026)

Aba própria na barra de baixo. Lista as contas do mês: o que já pagou, o que falta e o que está atrasado.

- **Paguei ou não:** gasto pago na mão nasce **a pagar** (status `a_pagar`). Não sai do saldo real até você marcar **Paguei**; aí o lançamento passa a `confirmado` e a `data` vira o **dia do pagamento** (o `vencimento` fica guardado). "Ainda não paguei" desfaz e a data volta pro vencimento.
- **Conta não paga não some:** fica como **atrasada** nos meses seguintes até ser paga (não pagou o aluguel de setembro: em outubro aparecem os dois). Paga em outubro, ela entra no saldo de outubro e aparece em Pagas de outubro.
- **Disponível para gastar** desconta tudo que está a pagar, inclusive atrasado, pra nunca parecer que sobra dinheiro.
- **Quem nasce pago:** crédito (segue a fatura, 4.4), VA, entradas e fixo marcado como **débito automático**. Valor que muda (luz, água) nasce estimado: o Paguei pede quanto veio.
- **Gasto avulso:** no formulário, "Já paguei" (padrão) ou "Ainda vou pagar" (a data vira o vencimento).
- **Tipo da conta:** aluguel, condomínio, luz, água, gás, internet, telefone, cartão, financiamento, empréstimo, escola, plano de saúde, seguro, assinatura, imposto, outra (`recorrencias.tipo_conta`, ícone lucide). Mostra também quanto tempo falta: "parcela 4/10, termina em mar/2027", "até dez/2026" ou "todo mês".
- **Fatura do cartão** aparece como conta: soma dos gastos no crédito que vencem no mês + parcelas e fixos do cartão que ainda vão cair. Marcar a fatura como paga é **só controle** (`pagamentos_fatura`): os gastos do cartão já contam no vencimento.
- **Pagar adiantado:** conta que ainda vai vencer já pode ser paga; vira lançamento da competência dela e o gerador não duplica.
- **Contas soltas (1.6.0):** gasto já pago que é conta de verdade (categorias Contas, Educação, Assinaturas, Pagamento de empréstimo, pago com boleto ou descrição com aluguel) também aparece em Pagamentos como paga, mesmo sem ser fixo (ex.: o que veio do extrato).
- **Paguei escolhe o banco (1.6.7):** o pagamento grava de qual banco saiu (padrão: banco da conta ou do fixo, senão o último usado, senão o único; o do VA fica de fora), senão o "Nas contas hoje" não desconta.
- **Fácil de achar:** aba Pagamentos, bloco "Contas pra pagar" no topo do Início (atrasadas e as que vencem em até 3 dias, com Paguei a um toque) e etiqueta "a pagar" na lista de lançamentos.
- **Próximos:** notificações (conta vencendo, atrasada) e comprovantes (foto ou PDF, no Vercel Blob).

### 4.15 Assistente com IA (Sprint 6.7, pedido em 08/10/2026)

Um chat só (Mais, Assistente) pra três coisas: **lançar falando** ("gastei 32 no iFood"), **analisar o mês** e **responder sobre o dinheiro** ("quanto gastei de mercado?", "dá pra gastar quanto por dia?").

- **O código calcula, a IA comenta.** A IA nunca faz conta: ela chama ferramentas (`ver_mes`, `buscar_lancamentos`) que devolvem os números já prontos e escritos em reais, pelos mesmos cálculos das telas (o disponível é o mesmo do Início, com ou sem saldo dos bancos). As instruções proíbem somar, subtrair ou inventar número.
- **Lançar:** a ferramenta `propor_lancamento` não salva nada. O app confere (categoria pelo nome, sem acento; valor em centavos; data válida; entrada sem forma) e mostra um cartão com **Salvar** e **Descartar**. Salvar usa a mesma validação e as mesmas regras do formulário (crédito segue a fatura, "ainda vou pagar" fica a pagar). Só lançamento único; fixo e parcela continuam no formulário.
- **Falar:** botão de microfone com o ditado do próprio navegador (grátis). Some onde o navegador não tem.
- **Qualquer IA, escolhida por variável** (pedido do Vinícius, 08/10/2026, pensando no portfólio): `src/lib/ia/` tem um formato neutro de conversa (`tipos.ts`), a lista de provedores (`config.ts`) e dois adaptadores: `anthropic.ts` (SDK oficial) e `compativel.ts` (formato de chat da OpenAI, com fetch puro, que serve pro Gemini, Groq, OpenRouter e pra qualquer IA futura). `IA_PROVEDOR` = `gemini` (padrão na fase de teste, plano grátis), `groq`, `openrouter`, `claude` ou `compativel` (só `IA_URL` + `IA_MODELO` + `IA_CHAVE`, sem mexer no código). `IA_MODELO` e `IA_URL` trocam o padrão de cada um. A tela mostra qual IA está respondendo.
- **Gasto baixo:** `max_tokens` 1024, raciocínio no mínimo onde dá (`reasoning_effort: low`), só as últimas 10 mensagens vão pra IA, no máximo 3 voltas de ferramenta por pergunta e propor lançamento encerra na primeira volta. No Claude Haiku 4.5 fica em torno de 1 a 3 centavos de real por pergunta; Gemini, Groq e OpenRouter têm plano grátis com limite por dia.
- **Chamada de ferramenta volta igual:** o adaptador guarda a chamada como o provedor mandou e devolve sem mexer (o Gemini anexa uma assinatura que precisa voltar).
- **Privacidade:** plano grátis do Gemini pode usar o que é enviado pra melhorar os produtos do Google. Bom pra teste com dado inventado; com dado de verdade em produção, preferir plano pago (Claude ou Gemini pago).
- **Chave:** variável do provedor (`GEMINI_API_KEY`, `GROQ_API_KEY`, `OPENROUTER_API_KEY`, `ANTHROPIC_API_KEY` ou `IA_CHAVE`), local no `.env.local` e na Vercel em Environment Variables. Sem ela, o assistente avisa o que falta. A API do Claude é paga à parte da assinatura do Claude.
- A conversa fica só na aba do navegador (`sessionStorage`), não vai pro banco.
- **IA reserva (1.9.0, pedido do Vinícius):** `IA_RESERVA` (ex.: `groq`) responde quando a principal dá qualquer erro (limite grátis do dia, 5xx, sem resposta, chave recusada). A pergunta recomeça do zero na reserva (chamada de uma IA não vai pra outra). A reserva usa só a chave própria (`GROQ_API_KEY`...); `IA_CHAVE`, `IA_MODELO` e `IA_URL` valem só pra principal. Sem a principal configurada, a reserva assume sozinha. A resposta da reserva mostra "Respondido pela IA reserva". Trocar de IA não mexe nos dados (tudo fica no banco).
- **Área Dev (1.10.0, pedido do Vinícius):** `/dev` (Mais, Dev), atrás do mesmo login com autenticador. Abas: **Diagnóstico** (versão, ambiente, banco, IAs com botão Testar, variáveis só com nome e se existem, aviso de nome parecido errado), **Logs** (tabela `logs`, migration 0014: nível info/aviso/erro, origem, mensagem, detalhe jsonb; o assistente grava cada pergunta com IA, tempo, voltas, ferramentas e tokens, e cada erro com código; somem depois de 30 dias; fora do backup) e **Dados** (contagem e últimos registros de cada tabela, só leitura; `acesso` e `aparelhos_push` só contagem). Botão "Copiar diagnóstico pro Claude" (sem valor de chave). Regra: nunca mostrar nem gravar valor de senha, chave ou segredo (`limparDetalhe` tira campo com cara de segredo), **nem repetir o valor de nenhuma variável em mensagem de erro** (1.10.1: uma chave colada em `IA_RESERVA` aparecia na tela Dev). `avisosDeValor` avisa quando `IA_PROVEDOR`/`IA_RESERVA` não têm nome de IA ou parecem ter uma chave. Editar dado continua nas telas do app, que validam. Pra registrar algo de outra parte do app: `registrar(nivel, origem, mensagem, detalhe)` de `src/db/logs.ts` (nunca derruba o app).
- **Escolher a IA na tela (08/10/2026, pedido do Vinícius, sem subir versão, pra testar):** seletor "IA" no topo do Assistente, como o seletor de modelo do Claude Code: Automático (principal + reserva) ou uma das IAs com chave (Gemini, Groq, OpenRouter, Claude); sem chave aparece desligada. A escolha fica no aparelho (`localStorage`, chave `bolso-ia`) e só ela responde, sem reserva. Cada resposta mostra "por <IA>". O cartão do Início continua no Automático.
- **Parcelado (1.8.0):** `propor_lancamento` aceita `parcelas` (2 a 72): `valor` é o de cada parcela e `data` a da 1ª. Salvar cria a mesma recorrência temporária do formulário. Se a pessoa só souber o total e a taxa, a IA usa `simular_parcelamento` e pede o valor real da parcela antes de propor.
- **Simular parcelamento (1.8.0):** `lib/financas.ts` calcula as duas leituras comuns (Tabela Price e taxa aplicada uma vez) e a taxa ao ano. Loja e financeira nem sempre dizem qual usam; o valor que vale é o do cronograma delas.
- **Contexto do cartão (1.8.0):** cada resposta com cartão volta pra IA com um resumo "[Cartão: ...; a pessoa salvou/descartou]", pra ela saber o que já foi feito e não lançar duas vezes.
- **Instruções (1.8.0):** seções de conversa (completar o que foi dito, perguntar só o dado que falta, ler texto colado de banco), como o app conta e finanças do dia a dia (juros, rotativo, reserva), sem recomendar produto, investimento ou imposto.

### 4.16 Avisos, lembretes e notificações (Sprint 6.5, 1.7.3, pedido em 08/10/2026)

Tela **Avisos** (sino no topo do Início, com o número do que é urgente ou pede atenção; também em Mais). Regras em `lib/avisos.ts` e `lib/lembretes.ts` (testadas), dados em `db/avisos.ts`, envio em `db/push.ts`.

- **Agora:** o que pede atenção hoje. Contas (atrasada, vence hoje, amanhã, em até 3 dias), dia de receber (entrada fixa que cai hoje), lembretes, empréstimos com prazo (devolver e cobrar), metas em 80% ou estouradas, ritmo do mês (o dinheiro não dá até o fim do mês ou o disponível está negativo; mesma conta do Início), melhor dia de compra (dia seguinte ao fechamento do cartão), assinatura fixa que cobra amanhã, hora de guardar nos objetivos (no dia do salário fixo; sem salário fixo, dia 5; só se nada foi guardado no mês) e resumo do mês que passou (dias 1 a 3).
- **Quanto falta:** próxima vez de cada entrada fixa (salário, VA) e contas não pagas dos próximos 30 dias, com "em X dias".
- **Lembretes:** título, dia e repetição (uma vez, toda semana, todo mês, todo ano). Repetido conta sempre a partir do primeiro dia (31 cai no 28 em fevereiro e volta pro 31). **Feito**: o de uma vez sai da lista; o que repete pula pra próxima vez depois de hoje. O Assistente cria lembrete (`propor_lembrete`, só salva no toque) e responde o que vem pela frente (`ver_avisos`, com os dias já calculados). Lembretes entram no backup.
- **Notificação no celular (Web Push):** liga em Avisos, por aparelho. iPhone só com o app instalado na tela de início (iOS 16.4+). As chaves VAPID nascem no banco (`config_avisos`), como o segredo da sessão; `VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY` têm prioridade. O assunto que vai pro serviço de push é o endereço do site, nunca o e-mail.
- **Quando sai:** agendador da Vercel (`vercel.json`, plano grátis: uma vez por dia por tarefa, com até 59 min de folga): `/api/avisos/manha` às 8h (tudo menos o lembrete de lançar) e `/api/avisos/noite` às 20h (lançou hoje? e metas). A rota confere `CRON_SECRET` se existir, só roda no horário da vez (manhã 6h a 14h, noite depois das 18h) e responde só contagens.
- **Sem repetir:** cada aviso tem uma chave (`avisos_enviados`, que vira o histórico "Últimas notificações", 90 dias). Conta e lembrete atrasados lembram no 1º dia e depois a cada 3; meta, uma vez por estado no mês; ritmo, uma vez por semana e só depois que as entradas fixas do mês caíram. Avisos do mesmo tipo vão juntos numa notificação (até 5 por rodada). Não chegou em nenhum aparelho: desmarca e tenta na próxima.
- **O que mandar:** cada tipo liga e desliga em Avisos (tudo ligado por padrão).
- **Próximos:** horário escolhido (precisa de agendador de hora em hora: Vercel paga ou externo), resumo semanal, VA acabando, última parcela, comprovantes.

### 4.11 Contas e transferências (v2)

Hoje o app diz **quanto** dinheiro existe, não **onde** ele está. Na v2:

- **Contas/carteiras:** Banco A, Banco B, dinheiro, carteira digital. Cada lançamento pertence a uma conta.
- **Transferência entre contas** é um tipo próprio de movimentação, **nunca** gasto + entrada. Sai de uma conta e entra na outra sem mexer em saldo real, gasto ou entrada do mês.
- Melhora empréstimos e objetivos, que passam a apontar pra uma conta.
- Vem **antes** das notificações na fila da v2.
- **Começo feito em 07/10/2026 (Sprint 6.2):** tabela `contas` (nome, sigla, cor, cor_texto) e `lancamentos.conta_id` opcional. Cada lançamento mostra um **selo** com a sigla e a cor do banco (Itaú laranja, C6 preto, Alelo verde...). **Não é o logo oficial** (marca dos bancos; o app só usa ícone próprio). Cores dos selos testadas com contraste >= 4.5:1. Banco é escolhido no formulário (opcional) e gerenciado em Mais, Categorias, formas e bancos (apaga só se não tiver lançamento). **Saldo por banco (1.5.0):** `contas.saldo_base` + `saldo_base_em` (o que o banco mostrava no fim desse dia); saldo hoje = base + entradas − gastos confirmados daquele banco depois desse dia e até hoje. Banco do VA (a maioria dos movimentos é VA) fica fora do total. Lançamento sem banco não entra; por isso o formulário já vem com o último banco usado. Falta: transferência entre seus bancos (hoje Pix entre contas suas fica fora, então depois de uma transferência é preciso acertar o saldo).

### 4.12 Histórico de alterações (v2)

Dinheiro é dado sensível. Registrar quem mudou o quê e quando ("Gasto de R$ 80 alterado para R$ 95"), sem apagar o valor antigo. Fica pra depois da v1, mas a regra já vale: **lançamento apagado ou editado não some sem rastro** quando esse recurso chegar.

---

## 5. Modelo de dados (Postgres / Drizzle)

Todas as tabelas com `id`, `user_id`, `created_at`, `updated_at`. RLS por usuário quando for pro Neon.

- **usuarios** — id, nome, email (auth na Fase 5).
- **categorias** — nome, emoji, icone (nome do ícone lucide), cor, tipo (gasto|entrada), ativa.
- **formas_pagamento** — nome, tipo (pix|debito|credito|dinheiro|boleto|beneficio), dia_fechamento e dia_vencimento (só crédito, nullable).
- **lancamentos** — data (quando o dinheiro sai), data_compra, competencia (`YYYY-MM`, só em lançamento gerado por recorrência), descricao, valor, categoria_id, forma_pagamento_id, tipo (gasto|entrada), subtipo_entrada, recorrencia_id (nullable), parcela (nullable, o X de "parcela X/N"), status (estimado|confirmado|a_pagar, default confirmado), vencimento (quando a conta vence; ao pagar, data vira o dia do pagamento), holerite (jsonb opcional: bruto e descontos), obs. subtipo_entrada ganha `beneficio`.
- **recorrencias** — conta_id (banco, 1.6.5), tipo (fixa|fixa_variavel|temporaria), descricao, valor, dia_do_mes, categoria_id, forma_pagamento_id, total_parcelas (nullable), parcela_atual, data_inicio, data_fim (nullable), ativa, dia_vencimento, valor_estimado, meses_media (default 3), gerada_ate (`YYYY-MM`), dia_util (Nº dia útil; -1 = último; null = dia fixo), sabado_util (default true), tipo_conta (luz, água...), pagamento_automatico (débito automático, default false).
- **pagamentos_fatura** — forma_pagamento_id, competencia (`YYYY-MM`), pago_em. Fatura marcada como paga (só controle, 4.14).
- **metas** — categoria_id, limite_mensal.
- **objetivos** — nome, emoji, valor_alvo, data_alvo. **Sem `valor_guardado`**: o saldo do objetivo é a soma dos movimentos, num lugar só (ver abaixo).
- **movimentos_objetivo** — objetivo_id, data, valor (positivo = guardar, negativo = resgatar). É a fonte da verdade do saldo do objetivo.
- **lembretes** — titulo, inicio, data (próxima vez), repetir (nao|semanal|mensal|anual), concluido, concluido_em, origem (voce|assistente).
- **aparelhos_push** — endpoint (único), p256dh, auth, nome ("iPhone, Safari"), ultimo_envio, falhas.
- **config_avisos** — user_id, tipos (jsonb: o que mandar), vapid_publica, vapid_privada.
- **avisos_enviados** — chave (única por usuário), tipo, titulo, texto. Anti-repetição e histórico.
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
6b. **Avisos:** agora, quanto falta, lembretes e notificações no celular (4.16).
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
- **Sprint 4.2** PWA (instalar no celular, funcionar offline básico). Feito: manifesto (`app/manifest.ts`), ícones gerados por `npm run icones` (bolso coral com moeda menta, sem emoji; versão maskable), service worker próprio em `public/sw.js`. Offline: páginas já vistas abrem com a última versão (aviso "Sem internet" no topo); página nunca vista mostra `/offline`; lançar precisa de conexão. O service worker só registra em produção. **Instalar exige HTTPS**: no celular só funciona depois do deploy (Fase 5) ou com `next dev --experimental-https`.
- **Sprint 4.3** Exportar Excel/PDF + backup. Feito em Mais, Exportar e backup: planilha `.xlsx` do ano (aba de lançamentos com gasto negativo + aba de resumo por mês), relatório do mês feito pra impressão (`/relatorio`, "Salvar como PDF" do navegador, sem biblioteca de PDF), backup JSON de tudo e restauração (substitui tudo numa transação só, pede RESTAURAR digitado, valida o arquivo antes).

### 🟤 Fase 6 — v2

- **Sprint 6.1** Pagamentos do mês (4.14): aba Pagamentos, paguei ou não, atrasadas que seguem pro mês seguinte, tipo da conta, fatura do cartão, aviso no Início. Feito. A Vercel aplica as migrations sozinha a cada deploy (`vercel-build` = `db:migrate` + `next build`).
- **Sprint 6.2** Importar lançamentos + bancos com selo (4.11, começo). Feito: Mais, Exportar e backup, **Importar lançamentos** recebe um JSON `{app: "bolso", tipo: "importacao", lancamentos: [...]}` (data, descricao, valor em centavos, tipo, categoria e forma pelo nome, conta = banco, obs). Só adiciona, nunca apaga; o que já existe (mesmo dia, valor, tipo e descrição) fica de fora, então importar duas vezes não duplica. Categoria que não existe vira Outros; banco que não existe é criado com o selo dele. **Conciliação (1.3.0, pedido do Vinícius):** o que já está no app manda. Linha do extrato com mesmo tipo e valor até 4 dias de um lançamento seu (sem banco) completa o seu: ganha banco, forma, observação e a descrição se estava em branco (igual ao nome da categoria); data, valor e categoria ficam. Conta a pagar com o mesmo valor, de 7 dias antes até 45 dias depois do vencimento, vira paga no dia do banco, a mais antiga primeiro. Lançamento do mesmo banco perto da data conta como já importado (respeita edição). Banco diferente nunca casa. Extrato em PDF não é lido pelo app: o Claude converte e confere antes (saldo do dia ou total do mês batendo).
- **Sprint 6.3** Resumo do ano com análise e Arrumar duplicados (1.4.0). Feito.
- **Sprint 6.4** (1.5.0) Mapa de calor do mês e do ano com dias do salário e do VA, quanto tempo cada um dura, ritmo do mês, comparação com o mês passado, por banco, sobra por mês, totais do dia na lista, ordenar lançamentos e saldo em cada banco. Feito.
- **Sprint 6.8** (1.6.0) Conferir: curadoria de erros em Mais (por que o disponível difere do banco, bate com o banco, atrasadas sem pagamento, a pagar que parece paga, possíveis repetidos, sem banco) + Pagamentos conta as contas soltas já pagas. Feito.
- **Sprint 6.9** (1.6.5) Fixos com CRUD completo: editar tudo (inclusive banco, dia e parcelas), apagar de vez com 3 modos, virar fixo a partir de um lançamento, assinaturas do histórico no cartão e em Fixos. Feito.
- **Sprint 6.10** (1.6.6) Disponível e previsão com base no dinheiro dos bancos (por dia, por semana, ritmo). Feito.
- **Sprint 6.7** (1.7.0) Assistente com IA (4.15): um chat em Mais que lança falando, analisa o mês e responde sobre o dinheiro. A IA é escolhida por variável (Gemini, Groq, OpenRouter, Claude ou qualquer compatível); Gemini grátis na fase de teste. Feito. **1.8.0:** parcelado, simulação de juros, contexto do cartão salvo e instruções de finanças.
- **Sprint 6.5** (1.7.3) Avisos, lembretes e notificações no celular (4.16): tela Avisos com sino no Início, lembretes (também pelo Assistente), Web Push com agendador de manhã e à noite, 11 tipos de aviso. Feito (começo; horário escolhido e resumo semanal ficam pra depois).
- **Sprint 6.6** Comprovantes nas contas pagas (precisa do Vercel Blob ligado ao projeto).

### 🔵 Fase 5 — Nuvem (deixado pro final, de propósito)

- **Sprint 5.1** Migrar pro Neon + auth (login). Parte de código feita: `DATABASE_URL` liga o Neon (driver `neon-serverless`, com transação), sem ela segue o PGlite local; `npm run db:migrate` serve pros dois. Login com **senha única** (`BOLSO_SENHA`) e sessão assinada (`BOLSO_SEGREDO`, 32+ caracteres) num cookie HttpOnly de 90 dias, conferida no `src/proxy.ts`. Local sem senha fica aberto; **em produção sem as duas variáveis ninguém entra**. Sair apaga as páginas guardadas pro offline. **Revisto em 24/09/2026:** senha e segredo moram no banco (tabela `acesso`), sem precisar de variável na Vercel. Senha inicial **1234** (o Início avisa pra trocar); trocar em Mais salva só o hash (scrypt) e troca o segredo, derrubando os outros aparelhos. `BOLSO_SENHA`/`BOLSO_SEGREDO` continuam opcionais e têm prioridade. Banco Neon criado (us-east-1) e migrado. A Vercel criou a variável com prefixo: o app aceita `DATABASE_URL`, `neon_DATABASE_URL` ou `POSTGRES_URL`, e na Vercel sem nenhuma dá erro em vez de usar banco local.
- **Dois fatores (1.7.1, pedido do Vinícius em 08/10/2026):** TOTP (RFC 6238, SHA-1, 6 dígitos, 30s, janela de 1 passo) com app autenticador, em `src/lib/totp.ts` sem biblioteca (só o QR usa `qrcode`). Segredo e hashes dos 8 códigos de recuperação na tabela `acesso`. **Obrigatório com login ligado** (produção): o `proxy.ts` manda pra `/seguranca` até ligar. Login, trocar senha e desligar pedem senha + código (ou código de recuperação, que vale uma vez). O mesmo código não vale duas vezes (`totp_ultimo_passo`). 5 erros seguidos travam 15 min. Ligar ou desligar troca o segredo da sessão (os outros aparelhos saem). O cookie da sessão é gravado em `src/lib/cookie-sessao.ts`, fora de arquivo "use server".
- **Sprint 5.2** Deploy na Vercel, variáveis de ambiente. Feito: projeto conta-gasto na Vercel com Neon (aceita `DATABASE_URL`, `neon_DATABASE_URL` ou `POSTGRES_URL`). Senha e segredo da sessão ficam no banco (tabela `acesso`), senha inicial **1234**, troca em Mais. **RLS: não na v1** (um usuário só; o app já filtra tudo por `user_id`). Volta quando tiver mais de um usuário.
- **Sprint 5.3** Ajustes finais e publicação. Feito: busca nos lançamentos (sem acento, todas as palavras, também pelo valor), conta variável confirmada mostra a diferença vs média, pausar e retomar fixos (pausado não gera nem conta nos compromissos; ao retomar não gera os meses parados), tela Categorias e formas (Mais): criar, editar ícone e cor, desativar categoria (some dos formulários, histórico fica); categorias que o app usa pelo nome só trocam ícone e cor; forma de pagamento só é apagada se nunca foi usada, o tipo não muda depois de criada; nome repetido não pode.

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

### 10.1 Várias sessões do Claude ao mesmo tempo (regra do Vinícius, 07/10/2026)

Pode ter mais de uma sessão do Claude mexendo nesta mesma pasta. Pra não ter conflito:

1. **Antes de começar e antes de cada passo arriscado** (editar arquivo que outra pode estar usando, `git commit`/`push`, `npm run db:*`, `npm install`): rodar `ListAgents`, olhar `git status` (mudança que não é sua = outra sessão trabalhando) e ler o `.sessoes.md` na raiz.
2. **Se outra sessão estiver trabalhando agora** (ocupada no `ListAgents`, mudança dela no `git status` ou recado com menos de 30 min no `.sessoes.md`): **pausar e esperar**. Não editar os mesmos arquivos, não commitar, não mexer no banco. Pedir aviso com `SendMessage` + `notify_when_idle` e só continuar quando ela terminar.
3. **Deixar um mini resumo** no `.sessoes.md` (e mandar o mesmo por `SendMessage`): quem é, o que está fazendo, o que vai fazer e quais arquivos vai mexer. Atualizar ao terminar.
4. **A sessão que está trabalhando decide:** pode ignorar o recado (se não atrapalha) ou pedir/fazer uma mudança no que a outra deixou. **Se apagar ou desfazer algo da outra, justificar** no `.sessoes.md` e na mensagem (o quê, por quê e como recolocar). A outra recoloca depois.
5. **Commit só do que é seu:** `git add` arquivo por arquivo, nunca `git add -A` ou `git add .`. Arquivo de outra sessão nunca vai no seu commit.
6. Cada sessão segue as mesmas regras de versão (seção 10, "Versão a cada entrega") e de banco local (um processo por vez).

O `.sessoes.md` é só local (está no `.gitignore`): é o quadro de recados entre sessões, não vai pro GitHub.
- **Versão a cada entrega** (decidido em 07/10/2026): versionamento semântico `MAIOR.MENOR.CORREÇÃO`. Regra do Vinícius (07/10/2026): **implementar coisa nova sobe 0.1** (1.4 → 1.5), **bug ou coisa básica sobe 0.0.1** (1.5.0 → 1.5.1), **coisa mínima não muda o número**, só vai no envio. Mudança que exige ação do usuário sobe o MAIOR. Quando ele pedir várias coisas juntas, saem na mesma versão. A cada entrega: subir `version` no package.json, escrever no CHANGELOG.md e criar a tag `vX.Y.Z` no Git. A versão, o commit e a hora do build aparecem no rodapé de Mais (pra conferir se a Vercel já publicou).

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
| Tema              | sistema por padrão, escolha em Mais, guardada em cookie |
| Offline           | só leitura do que já foi visto; gravar precisa de internet |
| PDF               | página de relatório + imprimir do navegador, sem biblioteca |
| Restaurar backup  | apaga tudo e põe o backup no lugar, tudo ou nada |
| Login             | senha no banco, inicial 1234, troca em Mais |
| RLS               | não na v1 (um usuário, filtro por user_id no app) |
| Fixo pausado      | não gera nem conta; retomar não cobra os meses parados |
| Forma de pagamento | apaga só se nunca usada; tipo fixo depois de criada |
| Barber-saas       | o Bolso usa o endereço dele (decisão de 23/09/2026); depende de que tipo de endereço é |
| Pagamentos        | gasto pago na mão nasce a pagar; só sai do saldo ao marcar Paguei, na data do pagamento |
| Conta atrasada    | continua aparecendo nos meses seguintes até pagar; conta no disponível |
| Nasce pago        | crédito, VA, entrada e débito automático |
| Fatura paga       | só controle; gastos do cartão já contam no vencimento |
| Importar extrato | só adiciona, pula repetido, completa o que você já lançou (não duplica); transferência entre contas suas e cofrinho ficam de fora |
| Banco no lançamento | selo com sigla e cor, nunca o logo oficial |
| Botão +           | só no Início e em Lançamentos; some ao rolar pra baixo |
| Duplicados        | manual em dobro com extrato: fica o do extrato (decisão do Vinícius); apagar só depois de mostrar a lista |
| Várias sessões    | ver seção 10.1: checar, pausar e esperar, deixar resumo, justificar o que apagar |
| Conferir          | só mostra e sugere; apaga ou junta só com toque seu; repetido = pelo menos um lançado à mão, mesmo valor, até 1 dia |
| Pagamentos (o que entra) | fixos, a pagar e contas soltas pagas: categorias Contas, Educação, Assinaturas, Pagamento de empréstimo, boleto ou aluguel |
| Editar fixo       | muda o fixo e (opcional, padrão sim) as que estão a pagar; o pago nunca muda |
| Apagar fixo       | manter histórico (recomendado), apagar a pagar, ou apagar tudo; pede APAGAR |
| Virar fixo        | o lançamento vira a 1ª vez; não preenche meses que já acabaram |
| Assinaturas       | fixos em Assinaturas + cobranças da categoria nos últimos 45 dias que não são fixo |
| Disponível (1.6.6) | com saldos informados: bancos − falta pagar − objetivos; por dia e por semana até o dia 31 |
| Previsão (1.6.6)  | ritmo do dia a dia nos últimos 30 dias (sem contas); dá até o fim ou dia em que acaba |
| Dois fatores      | app autenticador obrigatório no site; 8 códigos de recuperação; 5 erros travam 15 min |
| Assistente no Início | cartão no topo com 3 comentários do mês, guardados no aparelho até você tocar em atualizar (1.10.2); só pede sozinho no primeiro uso |
| Versões            | nova função +0.1, bug/básico +0.0.1, mínimo não muda; rodapé de Mais mostra versão e commit |
| Saldo por banco   | você informa o saldo uma vez; o app soma os lançamentos do banco |
| Saldo em caixa    | saiu da tela em 1.5.1 (confundia com "Nas contas hoje"); cálculo mantido |
| Previsão do mês (tela) | um toque explica: já saiu + vai cair + dia a dia |
| Card do Início    | "Saldo real" virou "Sobrou no mês"; "Nas contas hoje" mostra o dinheiro nos bancos |
| Duração           | salário e VA "acabam" quando 95% foi gasto |
| Ordem da lista    | mais novos (padrão), mais antigos, maior, menor valor |
| Migrations no deploy | `vercel-build` roda db:migrate antes do build |
| Salário           | líquido no saldo; holerite só pra consulta  |
| Dia útil          | seg a sáb, sem feriados nacionais           |
| Vale alimentação  | saldo próprio, fora do saldo real            |
| Assistente (IA)   | um chat só; o código calcula, a IA comenta; lançamento só salva no toque |
| Notificações      | Web Push (sem app de loja); iPhone só instalado; chaves no banco |
| Horário dos avisos | 8h e 20h pelo agendador da Vercel (plano grátis: 1x por dia cada) |
| Aviso repetido    | atrasado lembra no 1º dia e a cada 3; meta 1x por estado no mês; ritmo 1x por semana, só depois do salário |
| Lembrete          | título + dia + repetição; o Assistente propõe, salva no toque |
| Versão 1.7.3      | escolhida pelo Vinícius pra notificações (a regra daria 1.8.0; a 1.8.0 fica pro parcelado do Assistente) |
| Provedor da IA    | escolhido por `IA_PROVEDOR`; Gemini grátis na fase de teste, Claude Haiku 4.5 como opção paga |
| Área Dev          | `/dev` só leitura + logs + testar IA; nunca mostra valor de chave; editar só pelas telas |
| IA reserva        | `IA_RESERVA=groq`: entra quando a principal falha; pergunta recomeça do zero nela |
| Juros no assistente | conta feita pelo app (Price e taxa uma vez); a parcela que vale é a do cronograma da loja |

### A confirmar

- 1ª cor da paleta (`#FCEFF` tem 5 dígitos, assumido `#FCEFFE`).
- Nome oficial do app (working name: **Bolso**).


---

## 12. Glossário rápido

- **Saldo real:** o que é seu (entradas − gastos do mês, sem empréstimo). Na tela do Início se chama **Sobrou no mês** (desde 1.5.0), pra não confundir com o dinheiro no banco.
- **Nas contas hoje:** quanto tem em cada banco: saldo informado + lançamentos daquele banco depois do dia informado (4.11).
- **Saldo em caixa:** o que tem na conta (saldo real − o que você emprestou + o que você pegou emprestado).
- **Comprometido:** fixos + parcelas que ainda vão cair.
- **Objetivo:** meta de poupança (caixinha).
- **Meta:** teto de gasto por categoria.
