import { describe, expect, it } from "vitest";
import { DURACAO_SESSAO_MS, configuracaoLogin, criarSessao, senhaConfere, sessaoValida } from "./sessao";

const SEGREDO = "x".repeat(40);
const AGORA = Date.UTC(2026, 8, 23, 12);

describe("sessão", () => {
  it("sessão criada vale", () => {
    const s = criarSessao(SEGREDO, AGORA);
    expect(s.expiraEm).toBe(AGORA + DURACAO_SESSAO_MS);
    expect(sessaoValida(s.valor, SEGREDO, AGORA)).toBe(true);
  });

  it("vence depois de 90 dias", () => {
    const s = criarSessao(SEGREDO, AGORA);
    expect(sessaoValida(s.valor, SEGREDO, AGORA + DURACAO_SESSAO_MS + 1)).toBe(false);
  });

  it("não vale com outro segredo", () => {
    expect(sessaoValida(criarSessao(SEGREDO, AGORA).valor, "y".repeat(40), AGORA)).toBe(false);
  });

  it("não dá pra esticar a validade mexendo no cookie", () => {
    const [, assinado] = criarSessao(SEGREDO, AGORA).valor.split(".");
    expect(sessaoValida(`${AGORA + DURACAO_SESSAO_MS * 10}.${assinado}`, SEGREDO, AGORA)).toBe(false);
  });

  it.each([undefined, "", "lixo", "123", ".abc", "abc.def"])("recusa cookie quebrado: %s", (v) => {
    expect(sessaoValida(v, SEGREDO, AGORA)).toBe(false);
  });

  it("sem segredo, nada vale", () => {
    expect(sessaoValida(criarSessao(SEGREDO, AGORA).valor, "", AGORA)).toBe(false);
  });
});

describe("senha", () => {
  it("confere só a senha certa", () => {
    expect(senhaConfere("minha senha", "minha senha")).toBe(true);
    expect(senhaConfere("minha senh", "minha senha")).toBe(false);
    expect(senhaConfere("", "minha senha")).toBe(false);
  });

  it("sem senha configurada ninguém entra", () => {
    expect(senhaConfere("", "")).toBe(false);
  });
});

describe("configuração", () => {
  it("local sem senha: login desligado", () => {
    expect(configuracaoLogin({ NODE_ENV: "development" }).ligado).toBe(false);
  });

  it("produção sem senha: login ligado e não configurado (ninguém entra)", () => {
    expect(configuracaoLogin({ NODE_ENV: "production" })).toMatchObject({ ligado: true, configurado: false });
  });

  it("segredo curto não serve", () => {
    expect(configuracaoLogin({ BOLSO_SENHA: "abc", BOLSO_SEGREDO: "curto", NODE_ENV: "production" }).configurado).toBe(false);
  });

  it("senha e segredo longo: configurado", () => {
    expect(configuracaoLogin({ BOLSO_SENHA: "abc", BOLSO_SEGREDO: SEGREDO, NODE_ENV: "production" }).configurado).toBe(true);
  });
});
