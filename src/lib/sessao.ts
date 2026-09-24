// Login com senha única (Sprint 5.1). O cookie guarda só a data de validade assinada com um segredo:
// sem senha, sem dado pessoal. Trocar o segredo derruba todas as sessões.
import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export const COOKIE_SESSAO = "bolso-sessao";
export const DURACAO_SESSAO_MS = 90 * 24 * 60 * 60 * 1000; // 90 dias

function assinatura(expiraEm: number, segredo: string) {
  return createHmac("sha256", segredo).update(`bolso:${expiraEm}`).digest("base64url");
}

export function criarSessao(segredo: string, agora = Date.now()) {
  const expiraEm = agora + DURACAO_SESSAO_MS;
  return { valor: `${expiraEm}.${assinatura(expiraEm, segredo)}`, expiraEm };
}

// Comparação em tempo constante: não dá pra descobrir a assinatura medindo o tempo da resposta
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

export function senhaConfere(digitada: string, correta: string): boolean {
  if (!correta) return false;
  return iguais(digitada, correta);
}

// Login ligado quando tem senha configurada, e sempre em produção (sem senha lá, ninguém entra)
export function configuracaoLogin(env: { BOLSO_SENHA?: string; BOLSO_SEGREDO?: string; NODE_ENV?: string }) {
  const senha = env.BOLSO_SENHA ?? "";
  const segredo = env.BOLSO_SEGREDO ?? "";
  const producao = env.NODE_ENV === "production";
  return {
    ligado: Boolean(senha) || producao,
    configurado: Boolean(senha) && segredo.length >= 32,
    senha,
    segredo,
  };
}
