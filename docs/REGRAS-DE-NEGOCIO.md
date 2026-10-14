# Regras de negócio

Como o Bolso conta o dinheiro. Este documento é a referência das regras; o código cita as seções pelo número (ex.: "4.4" é o cartão de crédito).

Princípio que guia tudo: **o app nunca infla o saldo.** Empréstimo não vira renda, dinheiro guardado sai do disponível, e conta que ainda não foi paga continua pesando.

> Valores são sempre guardados em **centavos inteiros** (R$ 12,34 = `1234`). Só a tela formata em reais.

## Sumário

- [4.1 Lançamento](#41-lançamento)
- [4.2 Tipos de entrada e salário](#42-tipos-de-entrada-e-salário)
- [4.3 Recorrência (fixos e parcelas)](#43-recorrência-fixos-e-parcelas)
- [4.4 Cartão de crédito](#44-cartão-de-crédito)
- [4.5 Metas por categoria](#45-metas-por-categoria)
- [4.6 Empréstimos](#46-empréstimos)
- [4.7 Objetivos](#47-objetivos)
- [4.8 Contas com valor variável](#48-contas-com-valor-variável)
- [4.9 Disponível para gastar](#49-disponível-para-gastar)
- [4.10 Linha do tempo](#410-linha-do-tempo)
- [4.11 Bancos e saldo por banco](#411-bancos-e-saldo-por-banco)
- [4.12 Histórico de alterações (futuro)](#412-histórico-de-alterações-futuro)
- [4.13 Vale alimentação](#413-vale-alimentação)
- [4.14 Pagamentos do mês](#414-pagamentos-do-mês)
- [4.15 Assistente com IA](#415-assistente-com-ia)
- [4.16 Avisos, lembretes e notificações](#416-avisos-lembretes-e-notificações)
- [5. Regras do banco de dados](#5-regras-do-banco-de-dados)
- [6. Fórmulas](#6-fórmulas)
- [Glossário](#glossário)

---

## 4.1 Lançamento

Toda movimentação é um lançamento de um destes tipos:

- **gasto**: sai dinheiro;
- **entrada**: entra dinheiro.

Campos: data, descrição, valor, categoria, forma de pagamento, banco, observação e, se veio de um fixo ou parcela, a recorrência de origem.

Cada lançamento tem um **status**:

| Status | Significado | Conta no saldo? |
| --- | --- | --- |
| `confirmado` | Aconteceu de verdade | Sim |
| `a_pagar` | Conta que ainda vai ser paga | Não (mas pesa no disponível) |
| `estimado` | Conta de valor variável esperando o valor real | Não (só na previsão) |

## 4.2 Tipos de entrada e salário

O tipo da entrada sai da categoria escolhida, sem campo extra no formulário:

| Categoria | Tipo | Observação |
| --- | --- | --- |
| Salário | `salario` | |
| Extra | `extra` | freela, hora extra |
| Presente | `doacao` | |
| Reembolso | `reembolso` | te devolveram |
| Vale alimentação | `beneficio` | saldo à parte (4.13) |
| Outros | `outros` | e qualquer categoria nova |
| Empréstimo recebido | `emprestimo` | desativada: empréstimo tem tela própria (4.6) |

**Salário e holerite.** O que conta no saldo é o **líquido**, o que cai na conta. Bruto e descontos (INSS, IR, plano de saúde) podem ser anotados no lançamento do salário **só pra consulta**: não viram lançamentos. Com holerite preenchido, o valor é sempre bruto menos descontos.

## 4.3 Recorrência (fixos e parcelas)

| Tipo | Exemplo | Como funciona |
| --- | --- | --- |
| **Fixa** | aluguel, internet, salário | Repete todo mês com valor conhecido, até ser encerrada |
| **Fixa variável** | luz, água, gás | Repete todo mês, mas o valor muda (4.8) |
| **Temporária** | celular em 10x | Repete por N meses e para sozinha. Mostra "parcela X/N" |

Fixos podem ser pausados ou encerrados sem apagar o histórico.

**Quando vira lançamento.** Só quando a data chega. Antes disso é um **compromisso**: aparece em "próximos dias" e no disponível, mas não mexe no saldo. Aluguel no dia 10, hoje é dia 5: é compromisso; no dia 10 vira lançamento.

- **Dia que não existe no mês** (31 em fevereiro): cai no último dia do mês.
- **Dia útil:** pode cair no **Nº dia útil** (ex.: salário no 5º) ou no **último dia útil**. Dia útil é de segunda a sábado (o sábado conta, como na regra de pagamento de salário; dá pra desligar em cada fixo), sem domingo e sem **feriados nacionais**, inclusive a Sexta-feira Santa, calculada a partir da Páscoa. Carnaval e Corpus Christi são ponto facultativo e contam como dia útil.
- **Parcelado:** a pessoa digita o valor de cada parcela e quantas são. A parcela 1 é a da compra.
- **Apagou um lançamento gerado?** Ele não volta. A recorrência guarda até que mês já gerou (`gerada_ate`).
- **Pausado** não gera nem conta nos compromissos. Ao retomar, não cobra os meses parados.

## 4.4 Cartão de crédito

**Toda compra no crédito segue a fatura**, à vista ou parcelada.

- Cada cartão tem **dia de fechamento** e **dia de vencimento**.
- **Fechamento:** compra até o dia de fechamento entra na fatura que fecha naquele mês; depois dele, na do mês seguinte. Fecha dia 20: compra no dia 20 entra, no dia 21 já é a próxima.
- **Vencimento:** se o vencimento é maior que o fechamento, vence no mesmo mês; senão, no mês seguinte. Fecha 25 e vence 5: a fatura de setembro vence em 05/10.
- **O gasto entra no mês do vencimento**, que é quando o dinheiro sai. O lançamento guarda as duas datas: `data_compra` (o que a pessoa digitou) e `data` (o vencimento, usado em todos os cálculos).
- **Parcela N** cai na fatura N−1 meses depois da fatura da parcela 1. A conta parte da fatura da primeira parcela, pra dia 31 em mês curto não pular fatura.
- **Cartão sem dias configurados:** conta no dia da compra.
- Marcar a fatura como paga é **só controle**: os gastos do cartão já contam no vencimento.

## 4.5 Metas por categoria

Teto mensal por categoria (ex.: Lazer até R$ 200).

- **O que conta:** gasto confirmado da categoria no mês. Estimado e pago com vale alimentação não contam.
- **Estados:** até 79,9% tranquilo; de 80% até bater o limite, atenção; **passou** do limite, estourou.
- Uma meta por categoria de gasto; o limite vale pra todo mês.

## 4.6 Empréstimos

Empréstimo **não é renda**. Tem tela própria e não é lançado como entrada.

- **Prazo** opcional: mostra "vence em X dias" ou "atrasado X dias".
- **Recebi de volta** (alguém te devia): só marca como quitado. Não vira entrada.
- **Paguei** (você devia): marca como quitado e o **valor pago vira gasto** na categoria "Pagamento de empréstimo", na data do pagamento.
  - Decisão de projeto, tomada sabendo da consequência: como o empréstimo não entrou como renda, devolver o valor como gasto faz o "sobrou no mês" ficar menor que a conta de verdade pelo valor emprestado. Isso é proposital: deixa visível que o dinheiro foi embora.
- **Não vai voltar** (alguém te devia): marca como perdido e o valor vira gasto em "Outros".
- **Reabrir** desfaz a quitação e apaga o gasto criado por ela.

## 4.7 Objetivos

Caixinhas de poupança. Ex.: "Viagem, R$ 3.000 até janeiro".

- Mostra guardado, quanto falta, **quanto guardar por mês** e barra de progresso.
- **Guardar e resgatar** não viram lançamento: o dinheiro continua no banco. Só o **disponível** desconta o que está guardado.
- Não dá pra resgatar mais do que está guardado.
- **Guardar por mês** = falta ÷ meses cheios até o mês do alvo (setembro até dezembro = 3), arredondado pra cima. Alvo no mês atual ou já passado: guardar tudo agora.
- O saldo do objetivo **nunca é gravado**: é sempre a soma dos movimentos (+300, +200, −50 = R$ 450).

## 4.8 Contas com valor variável

Luz, água, gás: caem todo mês, mas o valor muda.

- Entram como **estimado**, com o valor da **média dos últimos 3 meses confirmados**. Sem histórico, usa o valor digitado ao criar.
- Enquanto estimado: entra só na **previsão**, nunca no saldo.
- Ao confirmar o valor real da conta: vira confirmado, entra no saldo e realimenta a média.
- Na tela: etiqueta "estimado" e, depois de confirmar, a diferença pra média ("R$ 128, R$ 18 acima da média").

## 4.9 Disponível para gastar

Ter R$ 2.000 de saldo com R$ 1.500 já destinados a aluguel, parcela e objetivo não é ter R$ 2.000 pra gastar.

**Com os saldos dos bancos informados** (4.11), o disponível parte do dinheiro de verdade:

```
disponível = dinheiro nos bancos hoje (sem vale alimentação)
           − o que falta pagar no mês (inclusive atrasado)
           − tudo que está guardado nos objetivos
```

Mostra quanto dá **por dia** e **por semana** até o fim do mês. A **previsão** usa o ritmo: média do gasto do dia a dia nos últimos 30 dias (sem contas, que já estão no "falta pagar") vezes os dias que faltam. Diz se o dinheiro dá até o fim do mês (e quanto sobra) ou em que dia acaba.

**Sem saldos informados**, a conta é só do mês:

```
disponível = sobrou no mês − guardado no mês − compromissos até o fim do mês
```

- **Compromissos:** fixos, parcelas e contas variáveis (pela média) que ainda vão cair no mês, contas estimadas esperando confirmação e o que você deve com prazo até o fim do mês.
- **Entrada futura não conta** (salário que ainda vai cair): o disponível é conservador.
- **Posso gastar por dia** = disponível ÷ dias restantes (contando hoje), arredondado pra baixo. Zero ou negativo vira "sem folga".
- Negativo aparece como negativo, com aviso. Nunca é escondido.
- Disponível, previsão e linha do tempo aparecem só no mês atual.

## 4.10 Linha do tempo

Em vez de só dizer "você tem R$ X", mostra **o que vai acontecer com esse dinheiro**:

```
ATÉ HOJE
├── R$ 31,10   almoço (hoje)
├── R$ 74,00   feira
└── R$ 1.150   aluguel

PRÓXIMOS DIAS
├── R$ 99,90   internet (dia 15)
├── R$ 215,00  IPVA (dia 16, a pagar)
└── R$ 150,73  conta de luz (dia 20, estimado)

FIM DO MÊS
└── Faltam R$ 354,43 depois de tudo cair
```

- Até hoje: lançamentos de hoje e os mais recentes do mês.
- Próximos dias: compromissos (4.9) e entradas previstas. No mesmo dia, entrada vem antes do gasto.
- Fim do mês: o disponível. Com entrada prevista, mostra também quanto fica se ela cair.
- Usa exatamente os mesmos cálculos do disponível.

## 4.11 Bancos e saldo por banco

- Cada lançamento pode ter um **banco**, mostrado como um selo com sigla e cor (nunca o logo oficial da marca). Cores dos selos com contraste mínimo de 4,5:1.
- **Saldo por banco:** a pessoa informa uma vez o saldo que o banco mostrava num dia; daí pra frente, saldo de hoje = saldo informado + entradas − gastos confirmados daquele banco depois desse dia.
- O banco do vale alimentação fica fora do total.
- O formulário já vem com o último banco usado, pra lançamento sem banco não furar a conta.
- Ainda falta: transferência entre bancos próprios como um tipo de movimentação (nunca gasto + entrada).

## 4.12 Histórico de alterações (futuro)

Dinheiro é dado sensível. A ideia é registrar quem mudou o quê e quando ("gasto de R$ 80 alterado para R$ 95") sem apagar o valor antigo.

## 4.13 Vale alimentação

VA só compra comida, então **não é dinheiro livre**.

- Tem **saldo próprio**, fora do saldo, das entradas, dos gastos e do "posso gastar".
- **Recebeu:** entrada na categoria "Vale alimentação" (pode ser fixa).
- **Pagou com o VA:** gasto com a forma de pagamento "Vale alimentação".
- **Saldo do VA** = tudo que entrou − tudo que foi pago com ele, acumulado (o que sobra passa pro mês seguinte).

## 4.14 Pagamentos do mês

Aba própria com as contas do mês: o que já foi pago, o que falta e o que está atrasado.

- **Quem nasce a pagar:** gasto pago na mão (Pix, boleto, débito sem ser automático). Só sai do saldo quando a pessoa marca **Paguei**; aí a data vira o dia do pagamento (o vencimento fica guardado).
- **Quem nasce pago:** crédito (segue a fatura), vale alimentação, entradas e fixo marcado como débito automático.
- **Conta não paga não some:** aparece como atrasada nos meses seguintes até ser paga, e pesa no disponível.
- **Pagar adiantado:** conta que ainda vai vencer pode ser paga; o gerador de recorrências não duplica.
- **Paguei escolhe o banco:** o pagamento grava de qual banco saiu, senão o saldo do banco não desconta.
- **Contas soltas:** gasto já pago que é conta de verdade (categorias Contas, Educação, Assinaturas, Pagamento de empréstimo, boleto ou "aluguel" na descrição) também aparece como paga.
- **Fatura do cartão** aparece como uma conta: gastos no crédito que vencem no mês + parcelas e fixos do cartão que ainda vão cair.
- **Urgência:** contas a pagar em grupos **Urgente** (atrasada, hoje ou amanhã), **Logo** (até 7 dias), **Com calma** e **Negociando**. Dentro do grupo pesa o custo de atrasar:

| Tipo | Peso | Tipo | Peso |
| --- | --- | --- | --- |
| Cartão | 7 | Escola, saúde, seguro | 3 |
| Aluguel | 6 | Internet, telefone, outra | 2 |
| Condomínio, luz, água, gás | 5 | Assinatura | 1 |
| Financiamento, empréstimo, imposto | 4 | | |

- **Negociar:** "Negociando" só marca a conta; "Acordo fechado" pode trocar data e valor. Continua contando no disponível.

## 4.15 Assistente com IA

Detalhes técnicos e como ligar estão em [IA.md](IA.md). As regras:

- **O código calcula, a IA comenta.** A IA nunca faz conta: chama ferramentas que devolvem os números já prontos, pelos mesmos cálculos das telas.
- **Nada é salvo sem o toque da pessoa.** Ao lançar, a IA propõe um cartão com **Salvar** e **Descartar**; salvar usa a mesma validação do formulário.
- **Parcelado:** a IA pode propor parcelas; se a pessoa só souber o total e a taxa, o app simula (Tabela Price e taxa aplicada uma vez) e pede o valor real da parcela.
- Sem recomendar produto financeiro, investimento ou imposto.

## 4.16 Avisos, lembretes e notificações

- **Agora:** contas (atrasada, hoje, amanhã, em até 3 dias), dia de receber, lembretes, empréstimos com prazo, metas em 80% ou estouradas, ritmo do mês (o dinheiro não dá até o fim), melhor dia de compra no cartão, assinatura que cobra amanhã, hora de guardar nos objetivos e resumo do mês anterior.
- **Quanto falta:** próxima entrada fixa e contas dos próximos 30 dias, com "em X dias".
- **Lembretes:** título, dia e repetição (uma vez, semanal, mensal, anual). Repetido conta a partir do primeiro dia (31 cai no 28 em fevereiro e volta pro 31).
- **Notificação no celular (Web Push):** liga por aparelho. No iPhone, só com o app instalado na tela de início.
- **Quando sai:** às 8h e às 20h, pelo agendador da Vercel.
- **Sem repetir:** cada aviso tem uma chave única. Conta atrasada lembra no 1º dia e depois a cada 3; meta, uma vez por estado no mês; ritmo, uma vez por semana.

---

## 5. Regras do banco de dados

- Toda tabela tem `id`, `user_id`, `created_at` e `updated_at`.
- **Centavos inteiros** em todo valor.
- **Saldo de objetivo é calculado**, nunca gravado.
- **Geração de recorrência é idempotente:** índice único em `recorrencia_id + competência` (+ parcela). Gerar duas vezes nunca duplica.

O schema completo está em [`src/db/schema.ts`](../src/db/schema.ts) e o diagrama em [ARQUITETURA.md](ARQUITETURA.md#modelo-de-dados).

## 6. Fórmulas

Todas em `src/lib/calculos.ts` e vizinhos, como funções puras e testadas.

| Conta | Fórmula |
| --- | --- |
| Total gasto no mês | gastos confirmados do mês, sem os pagos com VA |
| Total recebido | entradas do mês, sem empréstimo e sem VA |
| Sobrou no mês | recebido − gasto |
| Saldo do VA | entradas de VA − gastos pagos com VA (acumulado) |
| Comprometido no próximo mês | fixos, parcelas e variáveis (pela média) que vão cair nele |
| Disponível | ver 4.9 |
| Posso gastar por dia | disponível ÷ dias restantes, pra baixo |
| Progresso da meta | gasto da categoria no mês ÷ limite |
| Saldo do objetivo | soma dos movimentos |
| Guardar por mês | (alvo − saldo) ÷ meses até o alvo |

---

## Glossário

- **Sobrou no mês:** entradas − gastos do mês, sem empréstimo e sem VA.
- **Nas contas hoje:** quanto tem em cada banco (saldo informado + lançamentos depois dele).
- **Disponível:** quanto dá pra gastar até o fim do mês sem faltar pra nada já combinado.
- **Compromisso:** fixo, parcela ou conta que ainda vai cair no mês.
- **Comprometido:** o que já está destinado no próximo mês.
- **Meta:** teto de gasto por categoria.
- **Objetivo:** caixinha pra juntar dinheiro.
- **Competência:** o mês (`AAAA-MM`) a que um lançamento gerado pertence.
