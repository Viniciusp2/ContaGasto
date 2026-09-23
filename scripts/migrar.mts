// Aplica as migrations da pasta ./drizzle no banco local
import { migrate } from "drizzle-orm/pglite/migrator";
import { db, fecharBanco, PASTA_BANCO } from "../src/db";

await migrate(db, { migrationsFolder: "./drizzle" });
console.log(`Migrations aplicadas em ${PASTA_BANCO}`);

// Fecha a conexão, senão o PGlite segura o processo aberto
await fecharBanco();
