// Login com senha única (Sprint 5.1). O cookie guarda só a data de validade assinada com um segredo:
// sem senha, sem dado pessoal. Trocar o segredo derruba todas as sessões.
import { createHash, createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

export const COOKIE_SESSAO = "bolso-sessao";
export const DURACAO_SESSAO_MS = 90 * 24 * 60 * 60 * 1000; // 90 dias
// Senha de fábrica, até o Vinícius trocar em Mais (o app avisa enquanto ela estiver valendo)
export const SENHA_INICIAL = "1234";
export const TAMANHO_MINIMO_SENHA = 4;

function assinatura(expiraEm: number, segredo: string) {
  return createHmac("sha256", segredo).update(`bolso:${expiraEm}`).digest("base64url");
}

export function criarSessao(segredo: string, agora = Date.now()) {
  const expiraEm = agora + DURACAO_SESSAO_MS;
  return { valor: `${expiraEm}.${assinatura(expiraEm, segredo)}`, expiraEm };
}

// Comparação em tempo constante: não dá pra descobrir nada medindo o tempo da resposta
function iguais(a: string, b: string) {
  const x = createHash("sha256").update(a).digest();
  const y = createHash("sha256").update(b).digest();
  return timingSafeEqual(x, y);
}

export function sessaoValida(valor: string | undefined, segredo: string, agora = Date.now()): boolean {
  if (!valor || !segredo) return false;
  const [expira, assinado] = valor.split(".");
  const expiraEm = Number(expira);
  if (!Number.isFinite(expiraEm) || !assinado || expiraEm < agora) return false;
  return iguais(assinado, assinatura(expiraEm, segredo));
}

export function novoSegredo() {
  return randomBytes(32).toString("base64url");
}

// Hash da senha com scrypt (lento de propósito) e sal próprio: "scrypt$sal$hash"
export function hashDaSenha(senha: string): string {
  const sal = randomBytes(16).toString("base64url");
  const hash = scryptSync(senha, sal, 32).toString("base64url");
  return `scrypt$${sal}$${hash}`;
}

export function senhaConfereComHash(senha: string, guardado: string): boolean {
  const [tipo, sal, hash] = guardado.split("$");
  if (tipo !== "scrypt" || !sal || !hash) return false;
  return iguais(scryptSync(senha, sal, 32).toString("base64url"), hash);
}

// Qual senha vale: a trocada no app (hash no banco) > a da variável BOLSO_SENHA > a inicial 1234
export function senhaConfere(digitada: string, fonte: { senhaHash: string | null; senhaEnv: string }): boolean {
  if (fonte.senhaHash) return senhaConfereComHash(digitada, fonte.senhaHash);
  return iguais(digitada, fonte.senhaEnv || SENHA_INICIAL);
}

// Login ligado: sempre em produção; no computador, só se já tiver uma senha definida
export function loginLigado(env: { NODE_ENV?: string; BOLSO_SENHA?: string }, temSenhaNoBanco: boolean) {
  return env.NODE_ENV === "production" || Boolean(env.BOLSO_SENHA) || temSenhaNoBanco;
}

export function validarNovaSenha(nova: string, confirmacao: string): string | null {
  if (nova.length < TAMANHO_MINIMO_SENHA) return `A senha nova precisa de pelo menos ${TAMANHO_MINIMO_SENHA} caracteres.`;
  if (nova.length > 200) return "Senha grande demais.";
  if (nova !== confirmacao) return "A confirmação não bate com a senha nova.";
  if (nova === SENHA_INICIAL) return "Escolha uma senha diferente de 1234.";
  return null;
}
