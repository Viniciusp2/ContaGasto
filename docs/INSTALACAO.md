# Instalação e deploy

## Sumário

- [Requisitos](#requisitos)
- [Rodar no computador](#rodar-no-computador)
- [Abrir no celular pela rede de casa](#abrir-no-celular-pela-rede-de-casa)
- [Variáveis de ambiente](#variáveis-de-ambiente)
- [Publicar na Vercel com Neon](#publicar-na-vercel-com-neon)
- [Publicar a demonstração](#publicar-a-demonstração)
- [Banco de dados no dia a dia](#banco-de-dados-no-dia-a-dia)
- [Problemas comuns](#problemas-comuns)

---

## Requisitos

- **Node.js 20.9 ou mais novo** e npm.
- Não precisa instalar Postgres: no computador o app usa o [PGlite](https://pglite.dev), um Postgres que roda dentro do Node e salva numa pasta.

## Rodar no computador

```bash
git clone <url-deste-repositório> bolso
cd bolso
npm install
npm run db:setup   # cria as tabelas (migrations) e as categorias padrão
npm run dev
```

Abra `http://localhost:3000`. No computador o app abre sem senha.

O banco fica em `.data/pglite` (ignorado pelo Git). Pra começar do zero, apague essa pasta e rode `npm run db:setup` de novo.

Quer só ver o app cheio de dados, sem cadastrar nada? Use a demonstração:

```bash
BOLSO_DEMO=1 npm run dev
```

No Windows (PowerShell): `$env:BOLSO_DEMO="1"; npm run dev`.

## Abrir no celular pela rede de casa

O `next dev` já aceita acesso de IPs da rede local.

```bash
npm run dev -- -H 0.0.0.0
```

No celular, na mesma rede Wi-Fi, abra `http://IP-DO-COMPUTADOR:3000`. Instalar como app (PWA) e notificações exigem HTTPS, então só funcionam depois do deploy ou com `npx next dev --experimental-https`.

## Variáveis de ambiente

Copie `.env.example` pra `.env.local` e preencha o que for usar. Nada é obrigatório no computador.

| Variável | Pra quê | Obrigatória em produção? |
| --- | --- | --- |
| `DATABASE_URL` | Conexão do Neon. Também aceita `neon_DATABASE_URL` e `POSTGRES_URL` | Sim |
| `BOLSO_SENHA` | Senha de entrada. Depois dá pra trocar no app (fica só o hash no banco) | Sim, até trocar no app |
| `BOLSO_SEGREDO` | Segredo pra assinar a sessão (32+ caracteres). Sem ele, o app gera um e guarda no banco | Não |
| `CRON_SECRET` | Protege as rotas do agendador de notificações | Sim |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | Chaves de push. Sem elas, o app gera e guarda no banco | Não |
| `IA_PROVEDOR` + chave | Assistente com IA. Ver [IA.md](IA.md) | Não |
| `BOLSO_DEMO` | `1` liga o modo demonstração | Não |
| `BOLSO_REPO_URL` | Link do repositório, usado no cartão "ligue com a sua chave" da demonstração | Não |

Gerar um segredo forte:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

## Publicar na Vercel com Neon

1. **Crie o banco.** Em [neon.tech](https://neon.tech), crie um projeto e copie a connection string (`postgresql://...`). Ou, dentro da Vercel, adicione a integração do Neon em **Storage**: ela já cria a variável.
2. **Importe o repositório** na Vercel (**Add New, Project**). Ela reconhece o Next.js sozinha.
3. **Cadastre as variáveis** em **Settings, Environment Variables**: `DATABASE_URL`, `BOLSO_SENHA`, `CRON_SECRET` e, se quiser, as da IA.
4. **Publique.** O build da Vercel roda `npm run vercel-build`, que aplica as migrations no Neon antes do `next build`. Não precisa rodar nada à mão.
5. **Crie as categorias** uma vez, do seu computador, apontando pro Neon:

   ```bash
   DATABASE_URL="postgresql://..." npm run db:seed
   ```

6. **Entre e ligue o autenticador.** No primeiro acesso o app pede a senha e depois manda pra tela Segurança, onde você lê o QR code com o app autenticador e guarda os 8 códigos de recuperação.

As notificações usam o agendador da Vercel (`vercel.json`): `/api/avisos/manha` às 8h e `/api/avisos/noite` às 20h, horário de Brasília. No plano grátis cada tarefa roda uma vez por dia, com até uma hora de folga.

## Publicar a demonstração

A demonstração não precisa de banco nenhum. Crie **um segundo projeto** na Vercel apontando pro mesmo repositório e cadastre só:

```env
BOLSO_DEMO=1
BOLSO_REPO_URL=https://github.com/seu-usuario/bolso
```

Não cadastre `DATABASE_URL` nesse projeto. Mesmo que cadastre, o modo demonstração ignora, mas deixar de fora evita confusão.

Como funciona:

- o banco nasce na memória do servidor na primeira visita, com as migrations da pasta `drizzle/` (o `next.config.ts` inclui essa pasta no pacote publicado) e dados inventados a partir da data de hoje;
- depois de 30 minutos sem uso, ou quando a Vercel desliga a instância, os dados voltam ao exemplo;
- login, Dev, Segurança, restaurar backup, notificações e IA ficam desligados (detalhes em [SEGURANCA.md](SEGURANCA.md#modo-demonstração)).

Se a Vercel subir mais de uma instância ao mesmo tempo, cada uma tem o seu banco de exemplo. Com o tráfego de um portfólio isso é raro, e na pior das hipóteses um lançamento de teste "some" ao trocar de instância.

## Banco de dados no dia a dia

| Comando | O que faz |
| --- | --- |
| `npm run db:migrate` | Aplica as migrations pendentes (Neon se tiver `DATABASE_URL`, senão o local) |
| `npm run db:seed` | Cria usuário, categorias e formas de pagamento (pode rodar de novo, não duplica) |
| `npm run db:setup` | Os dois acima |
| `npm run db:generate` | Gera uma migration nova a partir de mudanças no `src/db/schema.ts` |
| `npm run db:studio` | Abre o Drizzle Studio pra ver as tabelas |
| `npm run db:ping` | Testa a conexão com o banco configurado |

Fluxo pra mudar o schema: edite `src/db/schema.ts`, rode `npm run db:generate`, confira o SQL gerado em `drizzle/`, rode `npm run db:migrate` e faça o commit dos dois.

## Problemas comuns

| Problema | Solução |
| --- | --- |
| "Banco não configurado na Vercel" | Falta `DATABASE_URL` no projeto da Vercel |
| "Nenhuma senha foi definida ainda" na tela de entrar | Cadastre `BOLSO_SENHA` na Vercel e publique de novo |
| O banco local travou ou corrompeu | Pare o `npm run dev`, apague `.data/pglite` e rode `npm run db:setup` |
| Dois processos usando o banco local | O PGlite aceita um processo por vez: não rode `db:migrate` com o `dev` aberto |
| Build falha baixando a fonte Inter | O `next/font` busca a fonte no Google durante o build; precisa de internet |
| Notificação não chega no iPhone | Só funciona com o app instalado na tela de início (iOS 16.4+) |
