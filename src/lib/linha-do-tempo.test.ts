import { describe, expect, it } from "vitest";
import { montarLinhaDoTempo, type ItemTempo } from "./linha-do-tempo";

const item = (chave: string, data: string, valor: number, entrada = false): ItemTempo => ({
  chave,
  descricao: chave,
  valor,
  data,
  entrada,
});

describe("linha do tempo", () => {
  const passados = [
    item("salário", "2026-09-05", 250000, true),
    item("mercado", "2026-09-23", 12000),
    item("combustível", "2026-09-23", 8000),
    item("farmácia", "2026-09-20", 3000),
    item("pizza", "2026-09-18", 5000),
    item("cinema", "2026-09-12", 4000),
  ];
  const proximos = [item("internet", "2026-09-28", 12000), item("aluguel", "2026-09-25", 125000), item("parcela 4/10", "2026-09-28", 15000), item("extra", "2026-09-28", 50000, true)];
  const l = montarLinhaDoTempo({ hoje: "2026-09-23", passados, proximos, disponivel: 78000 });

  it("separa o que foi hoje", () => {
    expect(l.hoje.map((i) => i.chave)).toEqual(["mercado", "combustível"]);
  });

  it("mostra os 3 mais recentes antes de hoje e conta o resto", () => {
    expect(l.recentes.map((i) => i.chave)).toEqual(["farmácia", "pizza", "cinema"]);
    expect(l.maisAntigos).toBe(1);
  });

  it("próximos dias em ordem de data, entrada antes de gasto no mesmo dia", () => {
    expect(l.proximos.map((i) => i.chave)).toEqual(["aluguel", "extra", "internet", "parcela 4/10"]);
  });

  it("fim do mês: disponível, e quanto fica se a entrada prevista cair", () => {
    expect(l.fimDoMes).toEqual({ disponivel: 78000, comEntradasPrevistas: 128000, entradasPrevistas: 50000 });
  });
});
