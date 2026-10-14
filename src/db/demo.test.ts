import { describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { criarBancoDemo } from "./demo";
import { categorias, lancamentos, recorrencias } from "./schema";

describe("banco da demonstração", () => {
  it("monta com dados de exemplo e sem nada a pagar esquecido no passado", async () => {
    const banco = criarBancoDemo("2026-10-14");
    const lanc = await banco.select().from(lancamentos);
    const recs = await banco.select().from(recorrencias);
    const cats = await banco.select().from(categorias);
    expect(cats.length).toBeGreaterThan(10);
    expect(recs.length).toBe(9);
    expect(lanc.length).toBeGreaterThan(60);
    expect(lanc.every((l) => l.data <= "2026-11-30")).toBe(true);
    const aPagar = lanc.filter((l) => l.status !== "confirmado");
    // Só o curso de outubro (atrasado), o IPVA e o que ainda não venceu
    expect(aPagar.every((l) => l.data >= "2026-10-01")).toBe(true);
    const salario = lanc.filter((l) => l.descricao === "Salário");
    expect(salario.length).toBe(4);
    const curso = await banco.select().from(lancamentos).where(eq(lancamentos.descricao, "Curso online"));
    expect(curso.find((l) => l.data === "2026-10-08")?.status).toBe("a_pagar");
  }, 60000);
});
