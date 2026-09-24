import { mkdirSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { Pool } from "@neondatabase/serverless";
import { drizzle as drizzlePglite, type PgliteDatabase } from "drizzle-orm/pglite";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-serverless";
import * as schema from "./schema";

// Com DATABASE_URL (Neon, na Vercel), usa o Postgres na nuvem.
// Sem ela, o Postgres embutido (PGlite) salvo em ./.data, como no desenvolvimento local.
export const PASTA_BANCO = process.env.PGLITE_DIR ?? "./.data/pglite";
export const USA_NEON = Boolean(process.env.DATABASE_URL);

// As duas conexões falam o mesmo Postgres pelo Drizzle; o tipo do PGlite serve pras duas
type Banco = PgliteDatabase<typeof schema>;

// Reaproveita a conexão entre hot reloads do next dev e entre requisições na Vercel
const global = globalThis as unknown as { pglite?: PGlite; pool?: Pool; bolsoDb?: Banco };

// Só abre o banco no primeiro uso. Assim o `next build` (vários workers) nunca
// abre a mesma pasta em paralelo, o que corromperia um banco de arquivo único.
function abrir() {
  if (!global.bolsoDb) {
    if (USA_NEON) {
      global.pool = new Pool({ connectionString: process.env.DATABASE_URL });
      global.bolsoDb = drizzleNeon(global.pool, { schema }) as unknown as Banco;
    } else {
      mkdirSync(PASTA_BANCO, { recursive: true });
      global.pglite = new PGlite(PASTA_BANCO);
      global.bolsoDb = drizzlePglite(global.pglite, { schema });
    }
  }
  return global.bolsoDb;
}

export const db = new Proxy({} as Banco, {
  get(_, prop) {
    const real = abrir();
    const valor = Reflect.get(real, prop);
    return typeof valor === "function" ? valor.bind(real) : valor;
  },
});

// Pros scripts: fecha a conexão, senão o processo fica aberto
export async function fecharBanco() {
  if (global.pglite) await global.pglite.close();
  if (global.pool) await global.pool.end();
  global.pglite = undefined;
  global.pool = undefined;
  global.bolsoDb = undefined;
}
