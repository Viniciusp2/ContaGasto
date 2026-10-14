import { mkdirSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { Pool } from "@neondatabase/serverless";
import { drizzle as drizzlePglite, type PgliteDatabase } from "drizzle-orm/pglite";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-serverless";
import { MODO_DEMO, precisaRestaurar } from "@/lib/demo";
import { urlDoBanco } from "@/lib/url-banco";
import { criarBancoDemo } from "./demo";
import * as schema from "./schema";

// Três jeitos de rodar:
// - com a URL do Neon (ver lib/url-banco): Postgres na nuvem
// - sem ela: Postgres embutido (PGlite) salvo em ./.data, pro desenvolvimento local
// - modo demonstração (BOLSO_DEMO=1): PGlite só na memória, com dados inventados (ver db/demo.ts)
export const PASTA_BANCO = process.env.PGLITE_DIR ?? "./.data/pglite";
const banco = MODO_DEMO ? { url: null, erro: null } : urlDoBanco(process.env);
export const USA_NEON = Boolean(banco.url);

// As conexões falam o mesmo Postgres pelo Drizzle; o tipo do PGlite serve pra todas
export type Banco = PgliteDatabase<typeof schema>;

// Reaproveita a conexão entre hot reloads do next dev e entre requisições na Vercel
const global = globalThis as unknown as {
  pglite?: PGlite;
  pool?: Pool;
  bolsoDb?: Banco;
  bolsoDemoUso?: number;
};

// Só abre o banco no primeiro uso. Assim o `next build` (vários workers) nunca
// abre a mesma pasta em paralelo, o que corromperia um banco de arquivo único.
function abrir() {
  if (MODO_DEMO) return abrirDemo();
  if (!global.bolsoDb) {
    if (banco.erro) throw new Error(banco.erro);
    if (banco.url) {
      global.pool = new Pool({ connectionString: banco.url });
      global.bolsoDb = drizzleNeon(global.pool, { schema }) as unknown as Banco;
    } else {
      mkdirSync(PASTA_BANCO, { recursive: true });
      global.pglite = new PGlite(PASTA_BANCO);
      global.bolsoDb = drizzlePglite(global.pglite, { schema });
    }
  }
  return global.bolsoDb;
}

// Demonstração: depois de um tempo sem uso, troca por um banco novo com os dados de exemplo.
// Sem uso quer dizer sem requisição no meio, então ninguém vê a troca acontecendo.
function abrirDemo() {
  const agora = Date.now();
  if (!global.bolsoDb || (global.bolsoDemoUso && precisaRestaurar(global.bolsoDemoUso, agora))) {
    global.bolsoDb = criarBancoDemo();
  }
  global.bolsoDemoUso = agora;
  return global.bolsoDb;
}

// Botão "Restaurar exemplo" da demonstração
export function restaurarDemo() {
  if (!MODO_DEMO) throw new Error("Só existe no modo demonstração.");
  global.bolsoDb = undefined;
  abrirDemo();
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
