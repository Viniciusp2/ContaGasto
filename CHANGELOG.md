# Histórico de versões do Bolso

Versão no formato `MAIOR.MENOR.CORREÇÃO` (versionamento semântico):

- **MAIOR** (2.0.0): muda algo grande que exige ação sua (ex.: dados que precisam ser refeitos).
- **MENOR** (1.3.0): função nova.
- **CORREÇÃO** (1.2.2): conserto ou ajuste pequeno.
- Mudança mínima (texto, detalhe visual) não muda o número: só vai no envio.

A versão que está no ar aparece no fim da tela **Mais**, com o código da publicação e a hora.

## 1.6.6 (08/10/2026)

- **Disponível até o fim do mês** com base no dinheiro dos bancos (quando os saldos estão informados): nas contas hoje menos o que falta pagar no mês menos o que está guardado nos objetivos. Mostra **quanto dá pra gastar por dia e por semana** até o dia 31, e o VA à parte (quanto dá por dia pra comida).
- **Previsão no seu ritmo**: média do dia a dia nos últimos 30 dias (sem contas, que já estão no "falta pagar"). Diz se o dinheiro dá até o fim do mês (e quanto sobra) ou em que dia acaba.
- Sem saldos informados, continua a conta antiga (só o mês), com a previsão de antes.
- Conferir usa a mesma conta do Início.

## 1.6.5 (07/10/2026)

- **Editar fixo por completo** (Fixos e parcelas, botão de lápis): descrição, valor, categoria, forma de pagamento, **banco**, dia (dia do mês, Nº dia útil, último dia útil), total de parcelas, tipo da conta e débito automático. Pode aplicar as mudanças também nas que ainda estão a pagar; o que já foi pago fica como estava.
- **Apagar fixo de vez**, escolhendo: manter o que já foi lançado (recomendado), apagar também o que está a pagar, ou apagar tudo que ele gerou. Pede APAGAR digitado.
- **Virar fixo**: um lançamento que já existe passa a repetir todo mês (na tela de editar lançamento). Não inventa meses que já passaram.
- **Assinaturas** do extrato (Spotify, Netflix...) agora contam no cartão de Assinaturas e aparecem em Fixos com "Virar fixo".
- Fixo pode ter banco: o que ele gera já sai com o banco, pro saldo do banco bater.
- Versão escolhida pelo Vinícius (1.6.5): a 1.7.0 fica pro Assistente com IA.

## 1.6.0 (07/10/2026)

- **Conferir** (Mais): caça o que pode fazer os números não baterem. Explica a diferença entre o Disponível e o que tem no banco (dinheiro de antes do mês + o que falta pagar + guardado), compara cada banco com o saldo que você digita do app do banco (e acerta se quiser), mostra contas atrasadas sem pagamento achado, contas a pagar que parecem já pagas (junta as duas com um toque), possíveis repetidos (apagar um ou "está certo, são dois") e lançamentos sem banco. Nada é apagado sem você mandar.
- **Pagamentos** agora conta também as contas pagas que entraram soltas (luz, Vivo, faculdade, assinaturas, boleto, aluguel), não só os fixos. "Já paguei" mostra o que de fato foi pago.

## 1.5.2 (07/10/2026)

- **Disponível para gastar**: um toque mostra a conta (sobrou no mês, menos o que foi guardado, menos o que ainda falta pagar) e a **lista do que ainda falta pagar**, com data e valor, e um atalho pra Pagamentos.

## 1.5.1 (07/10/2026)

- Saiu o cartão **Saldo em caixa** do Início (e do relatório): o dinheiro nos bancos agora é o "Nas contas hoje", e ter dois números parecidos confundia.
- **Previsão de gasto no mês**: um toque mostra como ela é calculada (já saiu + contas que ainda vão cair + o ritmo do dia a dia), pra o número não assustar.

## 1.5.0 (07/10/2026)

- **Nas contas hoje** (Início): quanto tem em cada banco. Informe o saldo de hoje de cada um em Mais, Categorias, formas e bancos (uma vez); daí pra frente o app soma os lançamentos de cada banco. Um toque abre Itaú, C6... O VA (Alelo) aparece à parte.
- O cartão "Saldo real" agora se chama **Sobrou no mês** (é o que ele sempre mostrou: entradas menos gastos do mês, não o dinheiro no banco).
- Ao lançar, o banco já vem marcado com o último que você usou.
- **Lançamentos:** do lado da data, quanto entrou (verde) e quanto saiu (vermelho) no dia, como no extrato; **ordenar** por mais novos, mais antigos, maior ou menor valor; botão **Ver o ano**.
- **Mapa de calor** do mês e do ano com os dias do **salário** (verde) e do **VA** (verde tracejado), e **quanto tempo cada um leva pra acabar** (salário em média, VA em média, mês a mês).
- **Gráficos do mês:** ritmo do mês (gasto acumulado x mês passado), o que mais mudou em relação ao mês passado e por banco.
- **Resumo do ano:** mapa de calor do ano, quanto sobrou em cada mês e por banco no ano.
- Botão Ver o ano também em Gráficos.

## 1.4.0 (07/10/2026)

- **Arrumar duplicados** (Mais, Exportar e backup): acha lançamentos seus que ficaram em dobro com os do extrato, mostra a lista e, depois de você confirmar, apaga os seus. O do extrato fica.
- Importar o mesmo arquivo de novo apaga as cópias a mais de uma importação que rodou em dobro (mantém exatamente quantos o arquivo tem).
- Duas importações não rodam mais ao mesmo tempo (era o que gravava tudo em dobro).
- **Resumo do ano** com análise: gasto mês a mês (gráfico animado), "o que dá pra notar" (mês mais caro e mais tranquilo, meses no vermelho, dia da semana que mais pesa, primeira x segunda quinzena, fim de semana, compras pequenas), os 5 dias que mais pesaram, por dia da semana e quando o dinheiro sai.
- Barras do resumo e dos gráficos agora enchem com animação.
- O botão **+** só aparece no Início e em Lançamentos, e some enquanto você rola pra baixo.
- Corrigido: barras de "Maiores vilões" e "Por forma de pagamento" apareciam vazias.

## 1.3.0 (07/10/2026)

- **Importar concilia com o que já está no app:** o que você lançou manda. Se o extrato trouxer o mesmo valor e tipo até 4 dias de diferença, o seu lançamento fica (data, valor, categoria) e só ganha banco, forma de pagamento, observação e a descrição, se estava em branco. Nada duplica.
- Conta que estava **a pagar** e aparece paga no extrato é marcada como paga no dia do banco, quitando a mais antiga primeiro (ex.: pagou setembro e outubro no mesmo dia).

## 1.2.3 (07/10/2026)

- Tocar num gráfico (por dia da semana, fluxo do mês) não desenha mais uma moldura preta por cima das barras.

## 1.2.2 (07/10/2026)

- **Importar lançamentos** subiu pra antes do Backup, na tela Exportar e backup.
- Arquivo de importação colocado em "Restaurar um backup" agora diz onde usar (e nada é mudado).

## 1.2.1 (07/10/2026)

- Os nomes das abas da barra de baixo não encostam mais um no outro no celular.
- Versão no rodapé de Mais.

## 1.2.0 (07/10/2026)

- **Importar lançamentos** (Mais, Exportar e backup): traz extratos já convertidos. Só adiciona, nunca apaga, e não duplica.
- **Selo do banco** em cada lançamento (Itaú, C6, Alelo...), escolha do banco no formulário e lista de bancos em Configurações.

## 1.1.0 (07/10/2026)

- Aba **Pagamentos**: contas do mês com "Paguei" e "Ainda não paguei", atrasadas que seguem pro mês seguinte, tipo da conta, fatura do cartão e aviso no Início.
- Gasto pode ser lançado como "Ainda vou pagar"; fixo pode ser débito automático.

## 1.0.0 (24/09/2026)

- Primeira versão completa (fases 1 a 5): lançamentos, fixos e parcelas, cartão pela fatura, metas, objetivos, empréstimos, vale alimentação, painel do Início com disponível e linha do tempo, resumo do ano, gráficos, modo escuro, PWA, exportar e backup, login, busca, pausar fixos e configurações.
