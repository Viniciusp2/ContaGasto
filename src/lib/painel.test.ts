import { describe, expect, it } from "vitest";
import { disponivelParaGastar, possoGastarPorDia, previsaoDoMes } from "./painel";
import { ocorrenciasNoIntervalo, type RecorrenciaBase } from "./recorrencias";

const set = { ano: 2026, mes: 9 };

describe("disponível para gastar", () => {
  it("exemplo do CLAUDE.md: 2.000 de saldo, 1.500 destinados", () => {
    // aluguel 1.000 + parcela 300 ainda vão cair, 200 guardados no objetivo
    expect(disponivelParaGastar(200000, 20000, 130000)).toBe(50000);
  });

  it("pode ficar negativo", () => {
    expect(disponivelParaGastar(100000, 0, 150000)).toBe(-50000);
  });
});

describe("posso gastar por dia", () => {
  it("exemplo do CLAUDE.md: 2.000 de saldo, aluguel de 1.000, faltam 10 dias", () => {
    // 21/09 até 30/09 = 10 dias contando hoje
    expect(possoGastarPorDia(100000, "2026-09-21", set)).toEqual({ porDia: 10000, diasRestantes: 10 });
  });

  it("último dia do mês conta 1 dia", () => {
    expect(possoGastarPorDia(5000, "2026-09-30", set)).toEqual({ porDia: 5000, diasRestantes: 1 });
  });

  it("sem folga quando não sobra nada", () => {
    expect(possoGastarPorDia(0, "2026-09-23", set).porDia).toBeNull();
    expect(possoGastarPorDia(-100, "2026-09-23", set).porDia).toBeNull();
  });

  it("arredonda pra baixo, nunca promete centavo a mais", () => {
    expect(possoGastarPorDia(10000, "2026-09-24", set)).toEqual({ porDia: 1428, diasRestantes: 7 });
  });
});

describe("previsão do mês", () => {
  it("não multiplica o aluguel pelos dias", () => {
    // dia 10: gastou 1.500 (aluguel 1.300 + 200 avulsos). Ritmo avulso 20/dia, faltam 20 dias. Internet 100 ainda cai.
    const p = previsaoDoMes({ gastoAteHoje: 150000, avulsoAteHoje: 20000, compromissos: 10000, hoje: "2026-09-10", mes: set });
    expect(p).toBe(150000 + 10000 + 40000);
  });

  it("no último dia é só o que saiu mais o que ainda cai hoje", () => {
    expect(previsaoDoMes({ gastoAteHoje: 90000, avulsoAteHoje: 30000, compromissos: 0, hoje: "2026-09-30", mes: set })).toBe(90000);
  });
});

describe("recorrências num intervalo", () => {
  const aluguel: RecorrenciaBase = {
    tipo: "fixa",
    diaDoMes: 10,
    dataInicio: "2026-08-10",
    dataFim: null,
    totalParcelas: null,
    geradaAte: "2026-09",
    diaUtil: null,
    sabadoUtil: true,
  };

  it("o que ainda vai cair até o fim do mês", () => {
    expect(ocorrenciasNoIntervalo({ ...aluguel, geradaAte: "2026-08" }, null, "2026-09-05", "2026-09-30").map((o) => o.data)).toEqual(["2026-09-10"]);
    expect(ocorrenciasNoIntervalo(aluguel, null, "2026-09-23", "2026-09-30")).toEqual([]);
  });

  it("o próximo mês inteiro", () => {
    expect(ocorrenciasNoIntervalo(aluguel, null, "2026-09-30", "2026-10-31").map((o) => o.data)).toEqual(["2026-10-10"]);
  });

  it("parcela que acaba antes não entra", () => {
    const celular = { ...aluguel, tipo: "temporaria" as const, totalParcelas: 2, dataInicio: "2026-08-23", diaDoMes: 23 };
    expect(ocorrenciasNoIntervalo(celular, null, "2026-09-30", "2026-10-31")).toEqual([]);
  });
});
