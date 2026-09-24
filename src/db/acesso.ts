// Acesso ao app: senha (hash) e segredo da sessão, guardados no banco.
// Assim não precisa configurar nada na Vercel: a senha começa em 1234 e é trocada em Mais.
import { eq } from "drizzle-orm";
import { hashDaSenha, loginLigado, novoSegredo, senhaConfere } from "@/lib/sessao";
import { db } from ".";
import { acesso } from "./schema";
import { USUARIO_PADRAO } from "./usuario-padrao";

const userId = USUARIO_PADRAO.id;

type Acesso = { senhaHash: string | null; segredo: string };

// O proxy consulta isso em toda requisição: guarda por uns segundos pra não ir ao banco toda hora
const TEMPO_CACHE_MS = 30_000;
const global = globalThis as unknown as { bolsoAcesso?: { valor: Acesso; em: number } };

async function lerDoBanco(): Promise<Acesso> {
  let [linha] = await db.select().from(acesso).where(eq(acesso.userId, userId));
  if (!linha) {
    // Primeira vez: cria o segredo da sessão
    await db.insert(acesso).values({ userId, segredoSessao: novoSegredo() }).onConflictDoNothing();
    [linha] = await db.select().from(acesso).where(eq(acesso.userId, userId));
  }
  return { senhaHash: linha.senhaHash, segredo: linha.segredoSessao };
}

export async function obterAcesso(usarCache = true) {
  const cache = global.bolsoAcesso;
  let dados: Acesso;
  if (usarCache && cache && Date.now() - cache.em < TEMPO_CACHE_MS) dados = cache.valor;
  else {
    dados = await lerDoBanco();
    global.bolsoAcesso = { valor: dados, em: Date.now() };
  }
  const envSegredo = process.env.BOLSO_SEGREDO ?? "";
  const envSenha = process.env.BOLSO_SENHA ?? "";
  return {
    ligado: loginLigado(process.env, Boolean(dados.senhaHash)),
    // BOLSO_SEGREDO, se configurado (32+), manda; senão o do banco
    segredo: envSegredo.length >= 32 ? envSegredo : dados.segredo,
    usandoSenhaInicial: !dados.senhaHash && !envSenha,
    confere: (digitada: string) => senhaConfere(digitada, { senhaHash: dados.senhaHash, senhaEnv: envSenha }),
  };
}

// Troca a senha e o segredo: todas as sessões abertas (outros aparelhos) caem. Devolve o segredo novo.
export async function gravarNovaSenha(nova: string): Promise<string> {
  const segredo = novoSegredo();
  await obterAcesso(false); // garante a linha
  await db
    .update(acesso)
    .set({ senhaHash: hashDaSenha(nova), segredoSessao: segredo })
    .where(eq(acesso.userId, userId));
  global.bolsoAcesso = undefined;
  const envSegredo = process.env.BOLSO_SEGREDO ?? "";
  return envSegredo.length >= 32 ? envSegredo : segredo;
}
