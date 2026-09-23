import { mkdirSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import * as schema from "./schema";

// Local: Postgres embutido (PGlite), salvo em ./.data. Na Fase 5 troca pro driver do Neon.
export const PASTA_BANCO = process.env.PGLITE_DIR ?? "./.data/pglite";
mkdirSync(PASTA_BANCO, { recursive: true });

// Reaproveita a conexão entre hot reloads do next dev
const global = globalThis as unknown as { pglite?: PGlite };
const cliente = global.pglite ?? new PGlite(PASTA_BANCO);
if (process.env.NODE_ENV !== "production") global.pglite = cliente;

export const db = drizzle(cliente, { schema });
