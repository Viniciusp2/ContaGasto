// Dados iniciais: usuário padrão, categorias e formas de pagamento.
// Pode rodar quantas vezes quiser: o que já existe é ignorado.
import { count } from "drizzle-orm";
import { db, fecharBanco } from "../src/db";
import { semearBasico } from "../src/db/dados-iniciais";
import { categorias, formasPagamento, usuarios } from "../src/db/schema";
import { USUARIO_PADRAO } from "../src/db/usuario-padrao";

await semearBasico(db, USUARIO_PADRAO);

const [u] = await db.select({ n: count() }).from(usuarios);
const [c] = await db.select({ n: count() }).from(categorias);
const [f] = await db.select({ n: count() }).from(formasPagamento);
console.log(`Seed ok: ${u.n} usuário, ${c.n} categorias, ${f.n} formas de pagamento`);

// Fecha a conexão, senão o PGlite segura o processo aberto
await fecharBanco();
