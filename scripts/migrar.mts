// Aplica as migrations da pasta ./drizzle: no Neon (com DATABASE_URL) ou no banco local
import { migrate as migrarPglite } from "drizzle-orm/pglite/migrator";
import { migrate as migrarNeon } from "drizzle-orm/neon-serverless/migrator";
import { db, fecharBanco, PASTA_BANCO, USA_NEON } from "../src/db";

if (USA_NEON) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await migrarNeon(db as any, { migrationsFolder: "./drizzle" });
  console.log("Migrations aplicadas no Neon");
} else {
  await migrarPglite(db, { migrationsFolder: "./drizzle" });
  console.log(`Migrations aplicadas em ${PASTA_BANCO}`);
}

// Fecha a conexão, senão o processo fica aberto
await fecharBanco();
