// Confere se o banco (Neon com DATABASE_URL, ou o local) sobe e responde
import { sql } from "drizzle-orm";
import { db, fecharBanco, PASTA_BANCO, USA_NEON } from "../src/db";

const resultado = await db.execute<{ version: string }>(sql`select version()`);
console.log(`Banco ok (${USA_NEON ? "Neon" : PASTA_BANCO}):`, resultado.rows[0].version);

// Fecha a conexão, senão o processo fica aberto
await fecharBanco();
