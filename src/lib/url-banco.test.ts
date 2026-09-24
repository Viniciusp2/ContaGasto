import { describe, expect, it } from "vitest";
import { urlDoBanco } from "./url-banco";

describe("qual banco usar", () => {
  it("DATABASE_URL tem prioridade", () => {
    expect(urlDoBanco({ DATABASE_URL: "postgres://a", neon_DATABASE_URL: "postgres://b" }).url).toBe("postgres://a");
  });

  it("aceita o nome com prefixo da integração Neon", () => {
    expect(urlDoBanco({ neon_DATABASE_URL: "postgres://b" }).url).toBe("postgres://b");
  });

  it("aceita POSTGRES_URL", () => {
    expect(urlDoBanco({ POSTGRES_URL: "postgres://c" }).url).toBe("postgres://c");
  });

  it("ignora variável vazia", () => {
    expect(urlDoBanco({ DATABASE_URL: "  ", neon_DATABASE_URL: "postgres://b" }).url).toBe("postgres://b");
  });

  it("local sem nada: banco local, sem erro", () => {
    expect(urlDoBanco({})).toEqual({ url: null, erro: null });
  });

  it("na Vercel sem nada: erro, nunca banco local", () => {
    const r = urlDoBanco({ VERCEL: "1" });
    expect(r.url).toBeNull();
    expect(r.erro).toContain("DATABASE_URL");
  });
});
