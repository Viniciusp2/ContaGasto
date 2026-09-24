import { describe, expect, it } from "vitest";
import { categoriaProtegida, validarCategoria, validarForma } from "./categorias";

const fd = (campos: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(campos)) f.set(k, v);
  return f;
};

describe("categoria", () => {
  const base = { tipo: "gasto", nome: "  Pet   shop ", icone: "Dog", cor: "#c5edb0" };

  it("aceita e arruma espaços e a cor", () => {
    expect(validarCategoria(fd(base))).toEqual({ ok: true, dados: { tipo: "gasto", nome: "Pet shop", icone: "Dog", cor: "#C5EDB0" } });
  });

  it.each([
    ["sem nome", { nome: " " }],
    ["nome longo", { nome: "x".repeat(31) }],
    ["ícone fora da lista", { icone: "Rocket" }],
    ["cor fora da paleta", { cor: "#000000" }],
    ["tipo inválido", { tipo: "transferencia" }],
  ])("recusa: %s", (_n, campos) => {
    expect(validarCategoria(fd({ ...base, ...campos })).ok).toBe(false);
  });

  it("categorias que a lógica usa são protegidas", () => {
    expect(categoriaProtegida("Salário")).toBe(true);
    expect(categoriaProtegida("Vale alimentação")).toBe(true);
    expect(categoriaProtegida("Pagamento de empréstimo")).toBe(true);
    expect(categoriaProtegida("Mercado")).toBe(false);
  });
});

describe("forma de pagamento", () => {
  it("aceita um cartão novo", () => {
    expect(validarForma(fd({ nome: " Nubank ", tipo: "credito" }))).toEqual({ ok: true, dados: { nome: "Nubank", tipo: "credito" } });
  });

  it("não deixa criar outro vale alimentação", () => {
    expect(validarForma(fd({ nome: "VR", tipo: "beneficio" })).ok).toBe(false);
  });

  it("recusa sem nome", () => {
    expect(validarForma(fd({ nome: "", tipo: "pix" })).ok).toBe(false);
  });
});
