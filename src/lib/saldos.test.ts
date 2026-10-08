import { describe, expect, it } from "vitest";
import { saldosNasContas, type ContaSaldo } from "./saldos";

const conta = (id: string, nome: string, saldoBase: number | null, saldoBaseEm: string | null): ContaSaldo => ({
  id, nome, sigla: nome, cor: "#000000", corTexto: "#FFFFFF", saldoBase, saldoBaseEm,
});
const mov = (contaId: string, data: string, tipo: "gasto" | "entrada", valor: number, extra = {}) => ({ contaId, data, tipo, valor, status: "confirmado", ...extra });

describe("saldo em cada banco", () => {
  const contas = [conta("itau", "Itaú", 115900, "2026-10-07"), conta("c6", "C6", 11738, "2026-10-07"), conta("alelo", "Alelo", 577, "2026-10-07")];

  it("sem nada depois do saldo informado: é o próprio saldo; total sem o VA", () => {
    const r = saldosNasContas(contas, [mov("alelo", "2026-09-26", "gasto", 100, { formaTipo: "beneficio" })], "2026-10-07");
    expect(r.total).toBe(127638);
    expect(r.linhas.map((l) => [l.nome, l.saldo, l.va])).toEqual([["Itaú", 115900, false], ["C6", 11738, false], ["Alelo", 577, true]]);
  });

  it("soma entradas e tira gastos depois do dia informado, até hoje, só confirmados", () => {
    const r = saldosNasContas(
      contas,
      [
        mov("itau", "2026-10-07", "gasto", 5000), // no próprio dia informado: já estava no saldo
        mov("itau", "2026-10-08", "gasto", 2200),
        mov("itau", "2026-10-09", "entrada", 10000),
        mov("itau", "2026-10-09", "gasto", 9999, { status: "a_pagar" }),
        mov("itau", "2026-10-20", "gasto", 7777), // futuro: ainda não saiu
        mov("c6", "2026-10-08", "gasto", 1738),
      ],
      "2026-10-10",
    );
    expect(r.linhas.find((l) => l.nome === "Itaú")!.saldo).toBe(115900 - 2200 + 10000);
    expect(r.linhas.find((l) => l.nome === "C6")!.saldo).toBe(10000);
  });

  it("banco sem saldo informado aparece pedindo o saldo e não entra no total", () => {
    const r = saldosNasContas([conta("itau", "Itaú", 1000, "2026-10-01"), conta("nu", "Nubank", null, null)], [], "2026-10-07");
    expect(r).toMatchObject({ total: 1000, faltaInformar: 1, algumInformado: true });
    expect(r.linhas.map((l) => l.saldo)).toEqual([1000, null]);
  });
});
