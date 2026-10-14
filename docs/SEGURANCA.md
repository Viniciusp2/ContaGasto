# Segurança

Um app de finanças guarda dado sensível. Este documento explica o que protege o ContaGasto hoje, o que a demonstração bloqueia e quais limites ainda existem.

## Sumário

- [Login e sessão](#login-e-sessão)
- [Autenticador (2FA)](#autenticador-2fa)
- [Proteção contra força bruta](#proteção-contra-força-bruta)
- [Validação e banco de dados](#validação-e-banco-de-dados)
- [Segredos e variáveis](#segredos-e-variáveis)
- [Cabeçalhos HTTP](#cabeçalhos-http)
- [Modo demonstração](#modo-demonstração)
- [Limites conhecidos](#limites-conhecidos)
- [Se você achar um problema](#se-você-achar-um-problema)

---

## Login e sessão

| O quê | Como |
| --- | --- |
| Senha | Guardada só como hash **scrypt** com sal aleatório (`scrypt$sal$hash`). A senha em si nunca é gravada |
| Comparação | Em **tempo constante** (`timingSafeEqual` sobre SHA-256), pra não vazar nada pelo tempo de resposta |
| Senha em produção | Obrigatória. Sem `BOLSO_SENHA` e sem senha trocada no app, a tela de entrar explica o que configurar e **ninguém entra**. A senha inicial `1234` só existe no computador |
| Senha nova | Mínimo de 8 caracteres, diferente de `1234`, pede a senha atual (e o código 2FA, se ligado) |
| Cookie | Só a validade assinada com **HMAC-SHA256**. Sem dado pessoal. `HttpOnly`, `Secure` em produção, `SameSite=Lax` |
| Trocar a senha | Gera um segredo de sessão novo: todos os outros aparelhos saem |
| Porteiro | `src/proxy.ts` roda antes de toda rota. Página sem sessão vai pro login; gravação sem sessão recebe 401 |
| Redirecionamento | Depois do login só volta pra caminho do próprio app (nada de `//outro-site`) |

## Autenticador (2FA)

- TOTP (RFC 6238): código de 6 dígitos a cada 30 segundos, no Google Authenticator, Microsoft Authenticator, Authy ou outro.
- Implementado sem biblioteca externa (`src/lib/totp.ts`), com testes contra os vetores da RFC.
- **Obrigatório em produção:** com login ligado, até ativar o autenticador só a tela Segurança abre.
- O mesmo código não vale duas vezes (guarda o último passo usado).
- **8 códigos de recuperação**, guardados só como hash, cada um vale uma vez.
- Entrar, trocar a senha e desligar o 2FA pedem senha **e** código. A mensagem de erro não diz qual dos dois errou.

## Proteção contra força bruta

- Cada tentativa errada espera 1 segundo antes de responder.
- **5 erros seguidos travam o login por 15 minutos** (senha ou código).
- A trava vale também pra trocar a senha.

## Validação e banco de dados

- Toda gravação passa por **Server Action**, que valida de novo no servidor: tipos, datas, valores em centavos, ids no formato UUID.
- Consultas pelo **Drizzle ORM**, sempre parametrizadas. Não existe SQL montado com texto do usuário.
- O React escapa todo texto na tela; não há HTML injetado a partir de dados.
- Toda consulta filtra por `user_id`.
- Regras importantes também viram restrição no próprio Postgres (`check` e índices únicos), então nem um bug no código consegue gravar valor negativo ou duplicar um fixo.
- Arquivos importados: limite de tamanho, leitura e validação de cada linha antes de gravar qualquer coisa, e restaurar backup é tudo ou nada (uma transação só).

## Segredos e variáveis

- Chaves e senhas só em variáveis de ambiente. `.gitignore` ignora todo `.env*` (menos o `.env.example`, sem valores).
- Extratos e documentos (`*.pdf`, `*.csv`, `*.ofx` em `public/`) também são ignorados, pra nunca serem publicados por engano.
- A área Dev mostra **só o nome** das variáveis configuradas, nunca o valor. Logs passam por um filtro que remove campos com cara de segredo.
- A rota do agendador (`/api/avisos/*`) exige `CRON_SECRET` em produção e responde só contagens, sem dado pessoal.

## Cabeçalhos HTTP

Configurados em `next.config.ts` pra todas as rotas:

- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY` (o app não abre dentro de iframe de outro site)
- `Referrer-Policy: strict-origin-when-cross-origin`
- O service worker tem `Content-Security-Policy` própria e nunca fica em cache.

## Modo demonstração

`BOLSO_DEMO=1` existe pra mostrar o app em público sem expor nada.

| Proteção | Como |
| --- | --- |
| Sem dado real | O banco é um Postgres **só na memória**, montado com dados inventados. A conexão com qualquer banco de verdade é ignorada, mesmo que `DATABASE_URL` esteja configurada |
| Sem login | Não existe senha nem conta. Trocar senha, autenticador e área Dev ficam fechados (as telas redirecionam e as ações recusam no servidor) |
| Sem custo | A IA fica desligada mesmo com chave configurada |
| Sem efeito fora | Notificações push e o agendador desligados. Restaurar backup desligado |
| Sem abuso de memória | Importar arquivo limitado a 500 KB |
| Volta sozinho | Depois de 30 minutos sem uso, o próximo visitante pega os dados de exemplo de novo. Botão **Restaurar** faz isso na hora |

Os bloqueios estão no servidor (nas Server Actions e no `proxy.ts`), não só escondidos na tela.

**Limite:** visitantes ao mesmo tempo dividem o mesmo banco de exemplo. Um pode ver o que o outro lançou, até a próxima restauração. Como é tudo inventado, isso é aceitável pra uma demonstração.

## Limites conhecidos

O ContaGasto 1.x foi feito pra **uma pessoa só**. Antes de abrir pra outras pessoas (versão 2.0), estes pontos precisam mudar:

- **Usuário único:** existe um usuário fixo no código. Multiusuário precisa de cadastro e de Row Level Security no Postgres, além do filtro por `user_id` que já existe.
- **Sessão sem revogação individual:** o cookie vale 90 dias. "Sair" apaga o cookie daquele aparelho; pra derrubar todos, é preciso trocar a senha. O ideal é guardar as sessões no banco.
- **CSP só no service worker:** falta uma `Content-Security-Policy` pra todas as páginas.
- **Dados em claro no servidor:** o banco é criptografado em disco pelo provedor (Neon), mas o servidor do app lê tudo. A 2.0 prevê criptografia de ponta a ponta.
- **IA:** a pergunta e os números relacionados vão pro provedor escolhido. A 2.0 prevê mandar só agregados.

O plano está no [roadmap](ROADMAP.md).

## Se você achar um problema

Abra uma issue descrevendo o problema **sem** incluir senhas, chaves ou dados pessoais, ou me procure pelo GitHub.
