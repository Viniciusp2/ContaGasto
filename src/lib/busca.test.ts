import { describe, expect, it } from "vitest";
import { filtrarLancamentos, normalizar } from "./busca";

const l = (descricao: string, categoriaNome: string, valor: number, extra = {}) => ({ descricao, categoriaNome, valor, formaNome: null, obs: null, ...extra });
const lista = [
  l("Remédio", "Farmácia", 4590, { formaNome: "Pix" }),
  l("Pizza de sexta", "Comida", 5990, { obs: "aniversário do João" }),
  l("Mercado", "Mercado", 23000, { formaNome: "Crédito" }),
];

describe("busca", () => {
  it("normaliza acento e maiúscula", () => {
    expect(normalizar("  FARMÁCIA  ")).toBe("farmacia");
  });

  it("acha sem acento", () => {
    expect(filtrarLancamentos(lista, "farmacia").map((x) => x.descricao)).toEqual(["Remédio"]);
  });

  it("busca na observação e na forma de pagamento", () => {
    expect(filtrarLancamentos(lista, "joao").map((x) => x.descricao)).toEqual(["Pizza de sexta"]);
    expect(filtrarLancamentos(lista, "credito").map((x) => x.descricao)).toEqual(["Mercado"]);
  });

  it("todas as palavras precisam bater", () => {
    expect(filtrarLancamentos(lista, "pizza sexta")).toHaveLength(1);
    expect(filtrarLancamentos(lista, "pizza sábado")).toHaveLength(0);
  });

  it("busca pelo valor", () => {
    expect(filtrarLancamentos(lista, "45,90").map((x) => x.descricao)).toEqual(["Remédio"]);
    expect(filtrarLancamentos(lista, "230").map((x) => x.descricao)).toEqual(["Mercado"]);
  });

  it("busca vazia devolve tudo", () => {
    expect(filtrarLancamentos(lista, "   ")).toHaveLength(3);
  });
});
