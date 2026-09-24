import { describe, expect, it } from "vitest";
import { TABELAS_BACKUP, lerBackup, nomeDoArquivo, prepararLinha } from "./backup";

const ID = "11111111-1111-4111-8111-111111111111";

function backup(extra: Record<string, unknown> = {}) {
  const dados = Object.fromEntries(TABELAS_BACKUP.map((t) => [t, [] as unknown[]]));
  dados.categorias = [{ id: ID, nome: "Mercado" }];
  return JSON.stringify({ app: "bolso", versao: 1, geradoEm: "2026-09-23T12:00:00Z", dados, ...extra });
}

describe("lerBackup", () => {
  it("aceita um backup válido e conta as linhas", () => {
    const r = lerBackup(backup());
    expect(r.ok && r.linhas).toBe(1);
  });

  it.each([
    ["JSON quebrado", "{"],
    ["outro app", backup({ app: "outro" })],
    ["versão desconhecida", backup({ versao: 2 })],
    ["sem dados", JSON.stringify({ app: "bolso", versao: 1 })],
    ["tabela faltando", JSON.stringify({ app: "bolso", versao: 1, dados: { categorias: [{ id: ID }] } })],
    ["id inválido", backup().replace(ID, "abc")],
    ["sem categorias", backup().replace(`[{"id":"${ID}","nome":"Mercado"}]`, "[]")],
  ])("recusa: %s", (_n, texto) => {
    expect(lerBackup(texto).ok).toBe(false);
  });
});

describe("prepararLinha", () => {
  it("troca o dono e volta as datas pra Date", () => {
    const l = prepararLinha({ id: ID, userId: "velho", createdAt: "2026-09-01T10:00:00.000Z", nome: "x" }, "novo");
    expect(l.userId).toBe("novo");
    expect(l.createdAt).toBeInstanceOf(Date);
    expect((l.createdAt as Date).toISOString()).toBe("2026-09-01T10:00:00.000Z");
    expect(l.nome).toBe("x");
  });
});

it("nome do arquivo leva a data", () => {
  expect(nomeDoArquivo("2026-09-23")).toBe("bolso-backup-2026-09-23.json");
});
