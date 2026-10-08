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

import { lerOrdem, ordenarLancamentos } from "./busca";

describe("ordenar lançamentos", () => {
  const lista = [
    { id: "c", data: "2026-10-07", valor: 2200 },
    { id: "b", data: "2026-10-06", valor: 196679 },
    { id: "a", data: "2026-10-01", valor: 990 },
  ];
  it("mais novos (como vem), mais antigos, maior e menor valor", () => {
    expect(ordenarLancamentos(lista, "recentes").map((l) => l.id)).toEqual(["c", "b", "a"]);
    expect(ordenarLancamentos(lista, "antigos").map((l) => l.id)).toEqual(["a", "b", "c"]);
    expect(ordenarLancamentos(lista, "maior").map((l) => l.id)).toEqual(["b", "c", "a"]);
    expect(ordenarLancamentos(lista, "menor").map((l) => l.id)).toEqual(["a", "c", "b"]);
  });
  it("ordem desconhecida vira a padrão", () => {
    expect(lerOrdem("xyz")).toBe("recentes");
    expect(lerOrdem(undefined)).toBe("recentes");
    expect(lerOrdem("maior")).toBe("maior");
  });
});
