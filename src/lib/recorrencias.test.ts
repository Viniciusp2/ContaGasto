import { describe, expect, it } from "vitest";
import {
  dataEfetiva,
  dataNoMes,
  mediaEstimada,
  ocorrencia,
  ocorrenciasPendentes,
  proximaOcorrencia,
  quantasGeradas,
  type RecorrenciaBase,
} from "./recorrencias";

const cartao = (diaFechamento: number, diaVencimento: number) => ({ diaFechamento, diaVencimento });

function rec(campos: Partial<RecorrenciaBase>): RecorrenciaBase {
  const dataInicio = campos.dataInicio ?? "2026-09-10";
  return {
    tipo: "fixa",
    diaDoMes: Number(dataInicio.slice(8, 10)),
    dataInicio,
    dataFim: null,
    totalParcelas: null,
    geradaAte: null,
    diaUtil: null,
    sabadoUtil: true,
    ...campos,
  };
}

describe("dia que não existe no mês", () => {
  it("cai no último dia", () => {
    expect(dataNoMes({ ano: 2026, mes: 2 }, 31)).toBe("2026-02-28");
    expect(dataNoMes({ ano: 2028, mes: 2 }, 30)).toBe("2028-02-29");
    expect(dataNoMes({ ano: 2026, mes: 4 }, 31)).toBe("2026-04-30");
    expect(dataNoMes({ ano: 2026, mes: 9 }, 5)).toBe("2026-09-05");
  });
});

describe("fatura do cartão", () => {
  it("sem dias configurados, conta no dia da compra", () => {
    expect(dataEfetiva("2026-09-23", null)).toBe("2026-09-23");
    expect(dataEfetiva("2026-09-23", { diaFechamento: null, diaVencimento: null })).toBe("2026-09-23");
    expect(dataEfetiva("2026-09-23", { diaFechamento: 20, diaVencimento: null })).toBe("2026-09-23");
  });

  it("fecha 20, vence 27: até o dia 20 vence no mesmo mês", () => {
    expect(dataEfetiva("2026-09-05", cartao(20, 27))).toBe("2026-09-27");
    expect(dataEfetiva("2026-09-20", cartao(20, 27))).toBe("2026-09-27");
  });

  it("fecha 20, vence 27: dia 21 já vai pra próxima fatura", () => {
    expect(dataEfetiva("2026-09-21", cartao(20, 27))).toBe("2026-10-27");
    expect(dataEfetiva("2026-09-30", cartao(20, 27))).toBe("2026-10-27");
  });

  it("fecha 25, vence 5: vence no mês seguinte ao fechamento", () => {
    expect(dataEfetiva("2026-09-10", cartao(25, 5))).toBe("2026-10-05");
    expect(dataEfetiva("2026-09-26", cartao(25, 5))).toBe("2026-11-05");
  });

  it("vira o ano", () => {
    expect(dataEfetiva("2026-12-22", cartao(20, 27))).toBe("2027-01-27");
    expect(dataEfetiva("2026-12-26", cartao(25, 5))).toBe("2027-02-05");
  });

  it("fechamento 31 em fevereiro fecha no último dia", () => {
    expect(dataEfetiva("2026-02-28", cartao(31, 10))).toBe("2026-03-10");
  });

  it("vencimento 31 em mês curto cai no último dia", () => {
    expect(dataEfetiva("2026-02-10", cartao(15, 31))).toBe("2026-02-28");
  });
});

describe("ocorrências de um fixo", () => {
  const aluguel = rec({ dataInicio: "2026-09-10" });

  it("repete todo mês no mesmo dia", () => {
    expect(ocorrencia(aluguel, 0, null)).toEqual({
      competencia: "2026-09",
      dataCompra: "2026-09-10",
      data: "2026-09-10",
      parcela: null,
    });
    expect(ocorrencia(aluguel, 4, null).data).toBe("2027-01-10");
  });

  it("dia 31 cai no último dia dos meses curtos e volta pro 31", () => {
    const r = rec({ dataInicio: "2026-01-31" });
    expect([0, 1, 2, 3].map((k) => ocorrencia(r, k, null).data)).toEqual([
      "2026-01-31",
      "2026-02-28",
      "2026-03-31",
      "2026-04-30",
    ]);
  });

  it("só vira lançamento quando a data chega", () => {
    expect(ocorrenciasPendentes(aluguel, null, "2026-09-05")).toEqual([]);
    expect(ocorrenciasPendentes(aluguel, null, "2026-09-10").map((o) => o.competencia)).toEqual(["2026-09"]);
  });

  it("abrir o app depois de meses gera tudo que ficou pra trás", () => {
    expect(ocorrenciasPendentes(aluguel, null, "2026-12-15").map((o) => o.competencia)).toEqual([
      "2026-09",
      "2026-10",
      "2026-11",
      "2026-12",
    ]);
  });

  it("não gera de novo o que já foi gerado", () => {
    const jaGerado = { ...aluguel, geradaAte: "2026-10" };
    expect(ocorrenciasPendentes(jaGerado, null, "2026-12-15").map((o) => o.competencia)).toEqual([
      "2026-11",
      "2026-12",
    ]);
    expect(ocorrenciasPendentes({ ...aluguel, geradaAte: "2026-12" }, null, "2026-12-15")).toEqual([]);
    expect(quantasGeradas(jaGerado)).toBe(2);
  });

  it("encerrado não gera depois do fim", () => {
    const encerrado = { ...aluguel, dataFim: "2026-10-15" };
    expect(ocorrenciasPendentes(encerrado, null, "2027-03-01").map((o) => o.competencia)).toEqual([
      "2026-09",
      "2026-10",
    ]);
    expect(proximaOcorrencia({ ...encerrado, geradaAte: "2026-10" }, null, "2027-03-01")).toBeNull();
  });

  it("mostra a próxima data", () => {
    expect(proximaOcorrencia(aluguel, null, "2026-09-05")?.data).toBe("2026-09-10");
    expect(proximaOcorrencia({ ...aluguel, geradaAte: "2026-09" }, null, "2026-09-23")?.data).toBe("2026-10-10");
  });

  it("fixo no crédito entra no vencimento da fatura", () => {
    const streaming = rec({ dataInicio: "2026-09-25" });
    const c = cartao(20, 27);
    expect(ocorrencia(streaming, 0, c).data).toBe("2026-10-27");
    expect(ocorrencia(streaming, 1, c).data).toBe("2026-11-27");
    // compra dia 25 de set só vira lançamento quando a fatura vence
    expect(ocorrenciasPendentes(streaming, c, "2026-09-30")).toEqual([]);
    expect(ocorrenciasPendentes(streaming, c, "2026-10-27").map((o) => o.data)).toEqual(["2026-10-27"]);
  });
});

describe("parcelado", () => {
  const celular = rec({ tipo: "temporaria", dataInicio: "2026-09-23", totalParcelas: 3 });

  it("sem cartão: parcela 1 no dia da compra, depois todo mês", () => {
    expect(ocorrenciasPendentes(celular, null, "2027-06-01").map((o) => [o.parcela, o.data])).toEqual([
      [1, "2026-09-23"],
      [2, "2026-10-23"],
      [3, "2026-11-23"],
    ]);
  });

  it("para depois da última parcela", () => {
    expect(proximaOcorrencia({ ...celular, geradaAte: "2026-11" }, null, "2026-11-30")).toBeNull();
  });

  it("no crédito (fecha 20, vence 27): compra dia 23 começa na fatura de outubro", () => {
    const c = cartao(20, 27);
    expect([0, 1, 2].map((k) => ocorrencia(celular, k, c).data)).toEqual([
      "2026-10-27",
      "2026-11-27",
      "2026-12-27",
    ]);
  });

  it("no crédito: compra dia 20 ainda entra na fatura de setembro", () => {
    const r = { ...celular, dataInicio: "2026-09-20", diaDoMes: 20 };
    expect(ocorrencia(r, 0, cartao(20, 27)).data).toBe("2026-09-27");
  });

  it("compra dia 31 no crédito não pula fatura em mês curto", () => {
    const r = rec({ tipo: "temporaria", dataInicio: "2026-01-31", totalParcelas: 3 });
    const c = cartao(30, 10);
    expect([0, 1, 2].map((k) => ocorrencia(r, k, c).data)).toEqual(["2026-03-10", "2026-04-10", "2026-05-10"]);
  });
});

describe("média da fixa variável", () => {
  it("sem histórico usa o valor digitado", () => {
    expect(mediaEstimada([], 3, 11000)).toBe(11000);
  });

  it("média dos últimos 3 confirmados", () => {
    expect(mediaEstimada([12800, 11000, 10200, 50000], 3, 0)).toBe(11333);
  });

  it("com menos de 3, usa o que tem", () => {
    expect(mediaEstimada([12000, 10000], 3, 0)).toBe(11000);
  });
});

import { comparacaoComMedia } from "./recorrencias";
import { textoDiferencaMedia } from "./dinheiro";

describe("comparação com a média (4.8)", () => {
  it("exemplo do CLAUDE.md: R$ 128 com média de R$ 110", () => {
    const c = comparacaoComMedia(12800, [11000, 11500, 10500], 3);
    expect(c).toEqual({ media: 11000, diferenca: 1800 });
    expect(textoDiferencaMedia(c!.diferenca).replace(/\s/g, " ")).toBe("R$ 18,00 acima da média");
  });

  it("abaixo e igual", () => {
    expect(textoDiferencaMedia(-500).replace(/\s/g, " ")).toBe("R$ 5,00 abaixo da média");
    expect(textoDiferencaMedia(0)).toBe("igual à média");
  });

  it("usa só os últimos N meses", () => {
    expect(comparacaoComMedia(10000, [10000, 10000, 10000, 90000], 3)).toEqual({ media: 10000, diferenca: 0 });
  });

  it("primeira conta: sem média pra comparar", () => {
    expect(comparacaoComMedia(10000, [], 3)).toBeNull();
  });
});

import { geradaAteAoRetomar, ocorrenciasPendentes as pendentesDepois } from "./recorrencias";

describe("pausar e retomar", () => {
  const internet = {
    tipo: "fixa" as const,
    diaDoMes: 10,
    dataInicio: "2026-05-10",
    dataFim: null,
    totalParcelas: null,
    geradaAte: "2026-06",
    diaUtil: null,
    sabadoUtil: true,
  };

  it("retomar pula os meses parados (jul, ago, set) e volta em outubro", () => {
    const geradaAte = geradaAteAoRetomar(internet, null, "2026-09-23");
    expect(geradaAte).toBe("2026-09");
    const retomado = { ...internet, geradaAte };
    expect(pendentesDepois(retomado, null, "2026-09-23")).toEqual([]);
    expect(pendentesDepois(retomado, null, "2026-10-10").map((o) => o.competencia)).toEqual(["2026-10"]);
  });

  it("retomar antes do dia do mês não pula o mês atual", () => {
    expect(geradaAteAoRetomar(internet, null, "2026-07-05")).toBe("2026-06");
  });

  it("nada caiu na pausa: mantém como estava", () => {
    expect(geradaAteAoRetomar({ ...internet, geradaAte: "2026-09" }, null, "2026-09-23")).toBe("2026-09");
  });
});
