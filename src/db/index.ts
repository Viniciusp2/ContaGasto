import { mkdirSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { drizzle, type PgliteDatabase } from "drizzle-orm/pglite";
import * as schema from "./schema";

// Local: Postgres embutido (PGlite), salvo em ./.data. Na Fase 5 troca pro driver do Neon.
export const PASTA_BANCO = process.env.PGLITE_DIR ?? "./.data/pglite";

type Banco = PgliteDatabase<typeof schema>;

// Reaproveita a conexão entre hot reloads do next dev
const global = globalThis as unknown as { pglite?: PGlite; bolsoDb?: Banco };

// Só abre o banco no primeiro uso. Assim o `next build` (vários workers) nunca
// abre a mesma pasta em paralelo, o que corromperia um banco de arquivo único.
function abrir() {
  if (!global.bolsoDb) {
    mkdirSync(PASTA_BANCO, { recursive: true });
    global.pglite = new PGlite(PASTA_BANCO);
    global.bolsoDb = drizzle(global.pglite, { schema });
  }
  return { cliente: global.pglite!, db: global.bolsoDb };
}

export const db = new Proxy({} as Banco, {
  get(_, prop) {
    const real = abrir().db;
    const valor = Reflect.get(real, prop);
    return typeof valor === "function" ? valor.bind(real) : valor;
  },
});

// Pros scripts: fecha a conexão, senão o PGlite segura o processo aberto
export async function fecharBanco() {
  if (!global.pglite) return;
  await global.pglite.close();
  global.pglite = undefined;
  global.bolsoDb = undefined;
}
