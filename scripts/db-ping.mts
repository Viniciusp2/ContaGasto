// Confere se o banco local sobe e responde
import { sql } from "drizzle-orm";
import { db, fecharBanco, PASTA_BANCO } from "../src/db";

const resultado = await db.execute<{ version: string }>(sql`select version()`);
console.log(`Banco ok em ${PASTA_BANCO}:`, resultado.rows[0].version);

// Fecha a conexão, senão o PGlite segura o processo aberto
await fecharBanco();
