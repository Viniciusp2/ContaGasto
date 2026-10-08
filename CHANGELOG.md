# Histórico de versões do Bolso

Versão no formato `MAIOR.MENOR.CORREÇÃO` (versionamento semântico):

- **MAIOR** (2.0.0): muda algo grande que exige ação sua (ex.: dados que precisam ser refeitos).
- **MENOR** (1.3.0): função nova.
- **CORREÇÃO** (1.2.2): conserto ou ajuste pequeno.
- Mudança mínima (texto, detalhe visual) não muda o número: só vai no envio.

A versão que está no ar aparece no fim da tela **Mais**, com o código da publicação e a hora.

## 1.9.0 (08/10/2026)

- **IA reserva:** quando a IA principal falha (acabou o limite grátis do dia, está fora do ar ou a chave foi recusada), o assistente faz a mesma pergunta pra outra IA sozinho. A resposta da reserva aparece com a etiqueta "Respondido pela IA reserva". Liga com as variáveis `IA_RESERVA=groq` e `GROQ_API_KEY` na Vercel (chave grátis em console.groq.com).
- O rodapé do Assistente mostra a principal e a reserva.
- Trocar de IA não mexe em nada dos seus dados: tudo fica no banco do app.

## 1.8.0 (08/10/2026)

- **Assistente lança parcelado:** "parcelei no AliExpress, 3x de 51,08 a partir de 20/10" monta o cartão com as parcelas, o total e a data da 1ª. Ao salvar, vai pra Fixos e parcelas, e cada parcela vira conta a pagar no mês dela (no cartão de crédito, segue a fatura).
- **Simula juros:** "comprei 124,58 em 3x com 23% ao mês, quanto fica?" mostra parcela, total e juros nas duas formas mais comuns de cobrar (Tabela Price e taxa aplicada uma vez) e quanto a taxa dá ao ano. A conta é do app, não da IA.
- **Lembra do que propôs:** o assistente sabe se você salvou ou descartou o cartão. Se pedir pra mudar algo já salvo, ele avisa pra editar ou apagar o antigo, pra não contar duas vezes.
- **Conhece o app e finanças:** como o Bolso conta (fatura do cartão, a pagar, estimado, VA, empréstimo, disponível, metas e objetivos) e explica juros, rotativo, parcelamento e reserva de emergência, sem empurrar produto.

## 1.7.3 (08/10/2026)

- **Avisos** (sino no topo do Início, ou Mais, Avisos e lembretes): tudo que pede atenção num lugar só.
  - **Agora:** conta atrasada ou vencendo, dia de receber, lembretes, empréstimo pra devolver ou cobrar, meta chegando no limite ou estourada, quando o dinheiro não deve dar até o fim do mês, melhor dia de compra no cartão, assinatura que renova amanhã, hora de guardar nos objetivos e o resumo do mês que passou.
  - **Quanto falta:** quantos dias faltam pro salário, pro VA e pra cada conta dos próximos 30 dias.
- **Lembretes:** "pagar o IPVA dia 15", uma vez ou repetindo (toda semana, todo mês, todo ano). Feito com um toque.
- **Notificação no celular:** ligue em Avisos. Chega de manhã (por volta das 8h) e à noite (por volta das 20h, "lançou os gastos de hoje?"). Escolha o que receber. No iPhone, precisa instalar o Bolso na tela de início.
- **Assistente:** "me lembra de pagar o IPVA dia 15" vira um lembrete (você confere e salva) e "quando cai o salário?" ou "o que vence essa semana?" ele responde com os dias contados.
- Lembretes entram no backup.
- Versão escolhida pelo Vinícius (1.7.3).

## 1.7.2 (08/10/2026)

- Corrigido: com o Gemini, o Assistente (e o cartão do Início) respondia "Não consegui responder agora" nas perguntas sobre o mês. O pedido da segunda volta (depois de buscar os números) levava campos que o Gemini pode recusar; agora vai só o do padrão.
- Se a IA estiver sobrecarregada, o app tenta de novo uma vez sozinho.
- Quando ainda assim der erro, a mensagem mostra o código (ex.: "código 503"), pra saber o motivo.

## 1.7.1 (08/10/2026)

- **Autenticação em dois fatores** (Mais, Segurança): além da senha, um código de 6 dígitos do app autenticador (Google Authenticator, Microsoft Authenticator, Authy). Liga lendo um QR code. No site é obrigatório: até ligar, só a tela Segurança abre. Ao ligar, os outros aparelhos saem e entram de novo com o código.
- **8 códigos de recuperação** (celular perdido), cada um vale uma vez; dá pra gerar novos.
- Trava contra força bruta: 5 erros seguidos (senha ou código) bloqueiam o login por 15 minutos. O mesmo código não vale duas vezes.
- Trocar a senha e desligar o autenticador também pedem o código.
- **Assistente no Início**: cartão no topo com comentários curtos sobre o mês (o que chama atenção, um alerta, uma dica), guardados no aparelho até o dia seguinte; botão pra pedir novos e atalho pra conversar ou lançar falando. Precisa da chave da IA configurada.

## 1.7.0 (08/10/2026)

- **Assistente** (Mais, Assistente): um chat com IA que faz três coisas.
  - **Lança falando:** escreva ou fale "gastei 32 no iFood no pix" e ele monta o lançamento (valor, categoria, dia, forma e banco). Você confere e toca em **Salvar**. Nada é salvo sem o seu toque.
  - **Analisa o mês:** "analisa meu mês" mostra onde mais foi dinheiro, o que mudou desde o mês passado, metas estouradas, compras pequenas e quanto dá pra gastar.
  - **Responde sobre o seu dinheiro:** "quanto gastei de mercado?", "quanto posso gastar por dia?". Os números vêm das mesmas contas das telas: a IA só explica.
- Botão de microfone pra falar em vez de digitar (usa o ditado do celular).
- **Escolha a IA** pela variável `IA_PROVEDOR`: Google Gemini (padrão, plano grátis), Groq, OpenRouter, Claude ou qualquer IA compatível com o formato da OpenAI. A tela mostra qual está respondendo. Precisa da chave do provedor escolhido (ex.: `GEMINI_API_KEY`) cadastrada na Vercel.

## 1.6.7 (08/10/2026)

- Corrigido: marcar **Paguei** numa conta não descontava do "Nas contas hoje" quando a conta não tinha banco. Agora o Paguei mostra de qual banco saiu, já marcado (o banco da conta ou do fixo, senão o último usado, senão o único), e desconta dele na hora. Dá pra trocar antes de tocar.
- Conta que já foi paga sem banco aparece em Mais, Conferir, "Lançamentos sem banco": toque e escolha o banco.

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
