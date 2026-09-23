# Bolso

Controle de gastos pessoal. Regras, domínio e roadmap estão no [CLAUDE.md](CLAUDE.md).

## Rodando local

```bash
npm install
npm run dev        # http://localhost:3000
```

O banco local é um Postgres embutido (PGlite), salvo em `.data/pglite`. Não precisa instalar nada.

| Script | O que faz |
| --- | --- |
| `npm run db:ping` | confere se o banco sobe |
| `npm run db:generate` | gera migration a partir do schema |
| `npm run db:migrate` | aplica as migrations |
| `npm run db:studio` | abre o Drizzle Studio |
| `npm run build` | build de produção |
