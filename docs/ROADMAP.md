# Roadmap

A 1.x é pra uma pessoa só. A **2.0** vai abrir o ContaGasto pra outras pessoas, e com dado financeiro dos outros a prioridade passa a ser privacidade.

Regra que guia tudo daqui pra frente: **o dado da pessoa fica no aparelho dela.** O servidor e a IA recebem o mínimo possível.

## Princípios da 2.0

1. **Local-first:** os dados moram no aparelho (PGlite/SQLite no navegador). O servidor só guarda pacotes criptografados.
2. **Criptografia de ponta a ponta:** chave derivada da senha (Argon2id e AES-256-GCM). Nem o servidor nem quem administra o app conseguem ler os dados de alguém.
3. **IA com acesso mínimo:** a IA nunca recebe extrato nem lançamento cru. Ela pede o que precisa por ferramentas que devolvem só agregados.
4. **A IA sugere, o app decide:** nada que a IA devolve é gravado sem passar por filtro do app e pelo toque da pessoa.
5. **Transparência:** a pessoa sempre vê o que foi enviado pra fora e o que o ContaGasto guarda sobre ela.
6. **IA opcional:** o app funciona inteiro sem ela.

---

## Etapa 0: fechar a 1.x

- [x] Senha inicial `1234` não vale em produção
- [x] Senha mínima de 8 caracteres
- [x] `CRON_SECRET` obrigatório em produção
- [x] Modo demonstração isolado pra portfólio
- [ ] Content-Security-Policy em todas as rotas
- [ ] Sessões guardadas no banco, com "sair de todos os aparelhos" e duração menor
- [ ] Provedor de IA pago, sem uso dos dados pra treino, como padrão

## Etapa 1: multiusuário e local-first

- [ ] Cadastro e login por pessoa, com 2FA (reaproveitando `src/lib/totp.ts`)
- [ ] Dados no aparelho: PGlite no navegador (IndexedDB), com o mesmo schema Drizzle
- [ ] Sync criptografado: o aparelho cifra as mudanças e o servidor só guarda o pacote
- [ ] Chave de recuperação na criação da conta (sem ela e sem a senha, os dados não voltam)
- [ ] Adicionar aparelho novo por QR code
- [ ] Row Level Security no Postgres, além do filtro por `user_id`

## Etapa 2: extrato lido no aparelho

- [ ] Ler OFX, CSV e PDF no navegador (pdf.js)
- [ ] O arquivo nunca sai do aparelho; depois de lido, ficam só os lançamentos
- [ ] Limpeza local antes de qualquer envio: CPF, nomes, chaves Pix, agência e conta
- [ ] Categorização por regras que aprendem com as correções da pessoa; só o que ficar em dúvida vai pra IA, já limpo

## Etapa 3: IA com acesso mínimo

- [ ] Ferramentas que devolvem só agregados (`total_por_categoria`, `comparar_meses`)
- [ ] Pseudônimos: "Pix pra João" vira "Pix pra [PESSOA_1]" antes de sair; a tabela de troca fica no aparelho
- [ ] Histórico da conversa só no aparelho
- [ ] Botão "ver o que foi enviado" em cada resposta
- [ ] IA desligada por padrão, com explicação clara ao ligar
- [ ] Cota de uso por pessoa

## Etapa 4: memória do assistente

A IA não guarda nada; quem guarda é o app, no aparelho, criptografado.

- [ ] Ficha por seções: preferências, objetivos, padrões gerais e contexto que expira sozinho
- [ ] Nunca entram na ficha: valores exatos, nomes de pessoas, número de conta, dívidas ou saúde sem a pessoa pedir
- [ ] A IA sugere o que lembrar; o app filtra e só então grava
- [ ] Vai pra IA só a parte da ficha que importa pra pergunta
- [ ] Tela "O que o ContaGasto sabe de mim", pra ver, editar e apagar
- [ ] Proteção contra injeção: texto vindo de extrato nunca vira memória

## Etapa 5: imagem

- [ ] QR code da nota fiscal (NFC-e) lido no aparelho: loja, itens e valor
- [ ] Código de barras de boleto lido no aparelho
- [ ] OCR local (Tesseract.js) pra comprovante de Pix e recibo
- [ ] IA com visão só como opção, com a imagem recortada no que importa

## Etapa 6: voz

Voz vira texto, a IA recebe só texto (com todas as proteções acima), a resposta vira voz. O áudio nunca chega na IA.

- [ ] Ouvir com Whisper rodando no aparelho; Whisper na nuvem como reserva pra celular simples
- [ ] Falar com a voz do próprio navegador; voz mais natural como opção
- [ ] Detector de fala, pra não precisar segurar botão
- [ ] Resposta em streaming e interrupção quando a pessoa fala

## 3.0: conversa em tempo real

- [ ] Voz pra voz contínua, como uma ligação
- [ ] Modelo local quando os celulares aguentarem, pra não mandar áudio pra fora

---

## Vale pra todas as etapas

- [ ] **LGPD:** termos de uso e privacidade, consentimento, exportar os dados e excluir a conta com tudo junto
- [ ] Teste automatizado de uma pessoa tentando ler ou alterar dado de outra (IDOR)
- [ ] Logs e erros sem dado pessoal
- [ ] Dependabot e `npm audit` no CI
- [ ] Plano de incidente: quem avisar, como trocar chaves, prazo da ANPD
- [ ] No futuro, Open Finance oficial no lugar do upload de extrato. Nunca guardar senha de banco de ninguém
