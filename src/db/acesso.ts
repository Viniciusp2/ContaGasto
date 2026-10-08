// Acesso ao app: senha (hash), segredo da sessão e dois fatores, guardados no banco.
// Assim não precisa configurar nada na Vercel: a senha começa em 1234 e é trocada em Mais.
import { eq } from "drizzle-orm";
import { hashDaSenha, loginLigado, novoSegredo, senhaConfere } from "@/lib/sessao";
import { aposErro, hashRecuperacao, novoSegredoTotp, novosCodigosRecuperacao, usarCodigoRecuperacao, verificarTotp } from "@/lib/totp";
import { db } from ".";
import { acesso } from "./schema";
import { USUARIO_PADRAO } from "./usuario-padrao";

const userId = USUARIO_PADRAO.id;

type Acesso = { senhaHash: string | null; segredo: string; totpAtivo: boolean };

// O proxy consulta isso em toda requisição: guarda por uns segundos pra não ir ao banco toda hora
const TEMPO_CACHE_MS = 30_000;
const global = globalThis as unknown as { bolsoAcesso?: { valor: Acesso; em: number } };

async function linhaDoAcesso() {
  let [linha] = await db.select().from(acesso).where(eq(acesso.userId, userId));
  if (!linha) {
    // Primeira vez: cria o segredo da sessão
    await db.insert(acesso).values({ userId, segredoSessao: novoSegredo() }).onConflictDoNothing();
    [linha] = await db.select().from(acesso).where(eq(acesso.userId, userId));
  }
  return linha;
}

async function lerDoBanco(): Promise<Acesso> {
  const linha = await linhaDoAcesso();
  return { senhaHash: linha.senhaHash, segredo: linha.segredoSessao, totpAtivo: Boolean(linha.totpSegredo) };
}

const segredoEfetivo = (doBanco: string) => {
  const envSegredo = process.env.BOLSO_SEGREDO ?? "";
  return envSegredo.length >= 32 ? envSegredo : doBanco;
};

export async function obterAcesso(usarCache = true) {
  const cache = global.bolsoAcesso;
  let dados: Acesso;
  if (usarCache && cache && Date.now() - cache.em < TEMPO_CACHE_MS) dados = cache.valor;
  else {
    dados = await lerDoBanco();
    global.bolsoAcesso = { valor: dados, em: Date.now() };
  }
  const envSenha = process.env.BOLSO_SENHA ?? "";
  return {
    ligado: loginLigado(process.env, Boolean(dados.senhaHash)),
    // BOLSO_SEGREDO, se configurado (32+), manda; senão o do banco
    segredo: segredoEfetivo(dados.segredo),
    usandoSenhaInicial: !dados.senhaHash && !envSenha,
    totpAtivo: dados.totpAtivo,
    confere: (digitada: string) => senhaConfere(digitada, { senhaHash: dados.senhaHash, senhaEnv: envSenha }),
  };
}

// Troca a senha e o segredo: todas as sessões abertas (outros aparelhos) caem. Devolve o segredo novo.
export async function gravarNovaSenha(nova: string): Promise<string> {
  const segredo = novoSegredo();
  await linhaDoAcesso();
  await db.update(acesso).set({ senhaHash: hashDaSenha(nova), segredoSessao: segredo }).where(eq(acesso.userId, userId));
  global.bolsoAcesso = undefined;
  return segredoEfetivo(segredo);
}

// ---- Trava contra força bruta ----

export async function bloqueioAtual(agora = Date.now()) {
  const linha = await linhaDoAcesso();
  return linha.bloqueadoAte && linha.bloqueadoAte.getTime() > agora ? linha.bloqueadoAte : null;
}

export async function registrarErro(agora = Date.now()) {
  const linha = await linhaDoAcesso();
  const r = aposErro(linha.errosSeguidos, agora);
  await db.update(acesso).set({ errosSeguidos: r.erros, bloqueadoAte: r.bloqueadoAte }).where(eq(acesso.userId, userId));
  return r.bloqueadoAte;
}

export async function zerarErros() {
  await db.update(acesso).set({ errosSeguidos: 0, bloqueadoAte: null }).where(eq(acesso.userId, userId));
}

// ---- Dois fatores ----

// Confere o segundo fator: código do app (6 dígitos) ou um código de recuperação (que deixa de valer)
export async function conferirSegundoFator(digitado: string, agora = Date.now()): Promise<"app" | "recuperacao" | null> {
  const linha = await linhaDoAcesso();
  if (!linha.totpSegredo) return null;
  const r = verificarTotp(linha.totpSegredo, digitado, agora, linha.totpUltimoPasso);
  if (r.ok) {
    await db.update(acesso).set({ totpUltimoPasso: r.passo }).where(eq(acesso.userId, userId));
    return "app";
  }
  const restantes = usarCodigoRecuperacao(digitado, linha.codigosRecuperacao ?? []);
  if (restantes) {
    await db.update(acesso).set({ codigosRecuperacao: restantes }).where(eq(acesso.userId, userId));
    return "recuperacao";
  }
  return null;
}

export async function estadoDoisFatores() {
  const linha = await linhaDoAcesso();
  return { ativo: Boolean(linha.totpSegredo), codigosRestantes: (linha.codigosRecuperacao ?? []).length, pendente: linha.totpPendente };
}

// Passo 1 da ativação: segredo novo, ainda pendente (só vale depois do primeiro código certo)
export async function iniciarAtivacao() {
  await linhaDoAcesso();
  const segredo = novoSegredoTotp();
  await db.update(acesso).set({ totpPendente: segredo }).where(eq(acesso.userId, userId));
  return segredo;
}

// Passo 2: o código do app confere com o segredo pendente. Liga o 2FA, gera os códigos de recuperação
// e troca o segredo da sessão (os outros aparelhos saem e precisam entrar de novo, já com o código).
export async function confirmarAtivacao(digitado: string, agora = Date.now()) {
  const linha = await linhaDoAcesso();
  if (!linha.totpPendente) return { ok: false as const, erro: "Comece a ativação de novo." };
  const r = verificarTotp(linha.totpPendente, digitado, agora, null);
  if (!r.ok) return { ok: false as const, erro: "Código errado. Confira se o relógio do celular está certo e tente o código novo." };
  const codigos = novosCodigosRecuperacao();
  const segredoSessao = novoSegredo();
  await db
    .update(acesso)
    .set({
      totpSegredo: linha.totpPendente,
      totpPendente: null,
      totpUltimoPasso: r.passo,
      codigosRecuperacao: codigos.map(hashRecuperacao),
      segredoSessao,
    })
    .where(eq(acesso.userId, userId));
  global.bolsoAcesso = undefined;
  return { ok: true as const, codigos, segredoSessao: segredoEfetivo(segredoSessao) };
}

export async function trocarCodigosRecuperacao() {
  const codigos = novosCodigosRecuperacao();
  await db.update(acesso).set({ codigosRecuperacao: codigos.map(hashRecuperacao) }).where(eq(acesso.userId, userId));
  return codigos;
}

export async function desativarDoisFatores() {
  const segredoSessao = novoSegredo();
  await db
    .update(acesso)
    .set({ totpSegredo: null, totpPendente: null, totpUltimoPasso: null, codigosRecuperacao: null, segredoSessao })
    .where(eq(acesso.userId, userId));
  global.bolsoAcesso = undefined;
  return segredoEfetivo(segredoSessao);
}
