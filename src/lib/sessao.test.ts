import { describe, expect, it } from "vitest";
import {
  DURACAO_SESSAO_MS,
  criarSessao,
  hashDaSenha,
  loginLigado,
  novoSegredo,
  senhaConfere,
  senhaConfereComHash,
  sessaoValida,
  validarNovaSenha,
} from "./sessao";

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

  it("não vale com outro segredo (trocar a senha troca o segredo)", () => {
    expect(sessaoValida(criarSessao(SEGREDO, AGORA).valor, novoSegredo(), AGORA)).toBe(false);
  });

  it("não dá pra esticar a validade mexendo no cookie", () => {
    const [, assinado] = criarSessao(SEGREDO, AGORA).valor.split(".");
    expect(sessaoValida(`${AGORA + DURACAO_SESSAO_MS * 10}.${assinado}`, SEGREDO, AGORA)).toBe(false);
  });

  it.each([undefined, "", "lixo", "123", ".abc", "abc.def"])("recusa cookie quebrado: %s", (v) => {
    expect(sessaoValida(v, SEGREDO, AGORA)).toBe(false);
  });

  it("segredo novo é aleatório e comprido", () => {
    const a = novoSegredo();
    expect(a.length).toBeGreaterThanOrEqual(40);
    expect(a).not.toBe(novoSegredo());
  });
});

describe("senha", () => {
  it("sem nada configurado, vale a senha inicial 1234", () => {
    expect(senhaConfere("1234", { senhaHash: null, senhaEnv: "" })).toBe(true);
    expect(senhaConfere("12345", { senhaHash: null, senhaEnv: "" })).toBe(false);
    expect(senhaConfere("", { senhaHash: null, senhaEnv: "" })).toBe(false);
  });

  it("BOLSO_SENHA substitui a 1234", () => {
    expect(senhaConfere("da-variavel", { senhaHash: null, senhaEnv: "da-variavel" })).toBe(true);
    expect(senhaConfere("1234", { senhaHash: null, senhaEnv: "da-variavel" })).toBe(false);
  });

  it("senha trocada no app vale mais que tudo", () => {
    const hash = hashDaSenha("minha nova senha");
    expect(senhaConfere("minha nova senha", { senhaHash: hash, senhaEnv: "da-variavel" })).toBe(true);
    expect(senhaConfere("da-variavel", { senhaHash: hash, senhaEnv: "da-variavel" })).toBe(false);
    expect(senhaConfere("1234", { senhaHash: hash, senhaEnv: "" })).toBe(false);
  });

  it("o hash não contém a senha e muda a cada vez (sal)", () => {
    const a = hashDaSenha("segredo123");
    expect(a).not.toContain("segredo123");
    expect(a.startsWith("scrypt$")).toBe(true);
    expect(a).not.toBe(hashDaSenha("segredo123"));
    expect(senhaConfereComHash("segredo123", a)).toBe(true);
    expect(senhaConfereComHash("segredo124", a)).toBe(false);
  });

  it("hash quebrado nunca confere", () => {
    expect(senhaConfereComHash("x", "lixo")).toBe(false);
    expect(senhaConfereComHash("x", "md5$a$b")).toBe(false);
  });
});

describe("quando o login está ligado", () => {
  it("em produção, sempre", () => {
    expect(loginLigado({ NODE_ENV: "production" }, false)).toBe(true);
  });

  it("no computador, só com senha definida", () => {
    expect(loginLigado({ NODE_ENV: "development" }, false)).toBe(false);
    expect(loginLigado({ NODE_ENV: "development" }, true)).toBe(true);
    expect(loginLigado({ NODE_ENV: "development", BOLSO_SENHA: "x" }, false)).toBe(true);
  });
});

describe("nova senha", () => {
  it.each([
    ["curta", "123", "123"],
    ["confirmação diferente", "abcdef", "abcdeg"],
    ["igual à inicial", "1234", "1234"],
  ])("recusa: %s", (_n, nova, conf) => {
    expect(validarNovaSenha(nova, conf)).not.toBeNull();
  });

  it("aceita uma senha boa", () => {
    expect(validarNovaSenha("cafe com leite", "cafe com leite")).toBeNull();
  });
});
