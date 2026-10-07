import { describe, expect, it } from "vitest";
import { BANCOS_CONHECIDOS, contraste, seloDoBanco } from "./bancos";

describe("selo do banco", () => {
  it("todo selo é legível (contraste >= 4.5)", () => {
    for (const b of Object.values(BANCOS_CONHECIDOS)) expect(contraste(b.cor, b.corTexto)).toBeGreaterThanOrEqual(4.5);
    expect(contraste("#E0CFE8", "#3A2E3F")).toBeGreaterThanOrEqual(4.5);
  });
  it("acha o banco pelo nome, sem acento e com apelido", () => {
    expect(seloDoBanco("Itaú").sigla).toBe("Itaú");
    expect(seloDoBanco("itau").cor).toBe("#EC7000");
    expect(seloDoBanco("C6 Bank").sigla).toBe("C6");
    expect(seloDoBanco("Banco do Brasil").sigla).toBe("BB");
  });
  it("banco desconhecido ganha lavanda e as primeiras letras", () => {
    expect(seloDoBanco("Sicredi")).toEqual({ sigla: "Sicre", cor: "#E0CFE8", corTexto: "#3A2E3F" });
  });
});
