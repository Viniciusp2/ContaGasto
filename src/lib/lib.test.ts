import { describe, expect, it } from "vitest";
import {
  dataValida,
  diaCurto,
  diasNoMes,
  hojeISO,
  intervaloDoMes,
  lerMes,
  mesDe,
  mesParaTexto,
  nomeDoMes,
  somarMeses,
} from "./datas";
import { centavosDeDigitos, formatarCentavos } from "./dinheiro";
import { subtipoDaCategoria } from "./entradas";
import { validarLancamento } from "./validar-lancamento";

const espacos = (s: string) => s.replace(/\s/g, " ");

describe("dinheiro", () => {
  it("formata centavos em reais", () => {
    expect(espacos(formatarCentavos(4590))).toBe("R$ 45,90");
    expect(espacos(formatarCentavos(0))).toBe("R$ 0,00");
    expect(espacos(formatarCentavos(123456789))).toBe("R$ 1.234.567,89");
  });

  it("máscara: dígitos entram pela direita", () => {
    expect(centavosDeDigitos("4")).toBe(4);
    expect(centavosDeDigitos("R$ 0,45")).toBe(45);
    expect(centavosDeDigitos("R$ 45,90")).toBe(4590);
    expect(centavosDeDigitos("")).toBe(0);
    expect(centavosDeDigitos("abc")).toBe(0);
  });

  it("máscara: limita em 9 dígitos", () => {
    expect(centavosDeDigitos("12345678901")).toBe(123456789);
  });
});

describe("datas", () => {
  it("hoje usa o fuso do Brasil, não UTC", () => {
    // 01:00 UTC do dia 24 ainda é dia 23 às 22h em São Paulo
    expect(hojeISO(new Date("2026-09-24T01:00:00Z"))).toBe("2026-09-23");
    expect(hojeISO(new Date("2026-09-24T12:00:00Z"))).toBe("2026-09-24");
  });

  it("lê o mês da URL e cai no mês de hoje se for inválido", () => {
    expect(lerMes("2026-03", "2026-09-23")).toEqual({ ano: 2026, mes: 3 });
    expect(lerMes("2026-13", "2026-09-23")).toEqual({ ano: 2026, mes: 9 });
    expect(lerMes("lixo", "2026-09-23")).toEqual({ ano: 2026, mes: 9 });
    expect(lerMes(undefined, "2026-09-23")).toEqual({ ano: 2026, mes: 9 });
  });

  it("soma meses virando o ano", () => {
    expect(somarMeses({ ano: 2026, mes: 12 }, 1)).toEqual({ ano: 2027, mes: 1 });
    expect(somarMeses({ ano: 2026, mes: 1 }, -1)).toEqual({ ano: 2025, mes: 12 });
    expect(somarMeses({ ano: 2026, mes: 9 }, 0)).toEqual({ ano: 2026, mes: 9 });
    expect(somarMeses({ ano: 2026, mes: 9 }, -13)).toEqual({ ano: 2025, mes: 8 });
  });

  it("dias do mês, com ano bissexto", () => {
    expect(diasNoMes({ ano: 2026, mes: 2 })).toBe(28);
    expect(diasNoMes({ ano: 2028, mes: 2 })).toBe(29);
    expect(diasNoMes({ ano: 2026, mes: 9 })).toBe(30);
    expect(diasNoMes({ ano: 2026, mes: 12 })).toBe(31);
  });

  it("intervalo do mês inclui o primeiro e o último dia", () => {
    expect(intervaloDoMes({ ano: 2026, mes: 2 })).toEqual({ inicio: "2026-02-01", fim: "2026-02-28" });
    expect(intervaloDoMes({ ano: 2026, mes: 12 })).toEqual({ inicio: "2026-12-01", fim: "2026-12-31" });
  });

  it("valida datas reais", () => {
    expect(dataValida("2026-09-23")).toBe(true);
    expect(dataValida("2028-02-29")).toBe(true);
    expect(dataValida("2026-02-29")).toBe(false);
    expect(dataValida("2026-13-01")).toBe(false);
    expect(dataValida("23/09/2026")).toBe(false);
    expect(dataValida("")).toBe(false);
  });

  it("converte entre texto e mês", () => {
    expect(mesParaTexto({ ano: 2026, mes: 3 })).toBe("2026-03");
    expect(mesDe("2026-09-23")).toEqual({ ano: 2026, mes: 9 });
  });

  it("nomes em português", () => {
    expect(nomeDoMes({ ano: 2026, mes: 9 })).toBe("setembro de 2026");
    expect(diaCurto("2026-09-23")).toBe("qua, 23 set");
  });
});

describe("tipo de entrada vem da categoria", () => {
  it("mapeia as categorias do seed", () => {
    expect(subtipoDaCategoria("Salário")).toBe("salario");
    expect(subtipoDaCategoria("Presente")).toBe("doacao");
    expect(subtipoDaCategoria("Empréstimo recebido")).toBe("emprestimo");
  });

  it("categoria desconhecida vira outros", () => {
    expect(subtipoDaCategoria("Bico de fim de semana")).toBe("outros");
  });
});

describe("validarLancamento", () => {
  const cat = "11111111-1111-4111-8111-111111111111";
  const forma = "22222222-2222-4222-8222-222222222222";

  function form(campos: Record<string, string>) {
    const f = new FormData();
    const base = { tipo: "gasto", valor: "4590", data: "2026-09-23", categoriaId: cat, ...campos };
    for (const [k, v] of Object.entries(base)) f.set(k, v);
    return f;
  }

  it("aceita o mínimo: tipo, valor, data e categoria", () => {
    const r = validarLancamento(form({}));
    expect(r).toEqual({
      ok: true,
      dados: {
        tipo: "gasto",
        valor: 4590,
        data: "2026-09-23",
        categoriaId: cat,
        formaPagamentoId: null,
        descricao: "",
        obs: null,
        repetir: "unico",
        parcelas: null,
        diaUtil: null,
        sabadoUtil: true,
        holerite: null,
      },
    });
  });

  it("salário no 5º dia útil e último dia útil", () => {
    const r = validarLancamento(form({ tipo: "entrada", repetir: "fixa", quando: "util", diaUtil: "5" }));
    expect(r.ok && [r.dados.diaUtil, r.dados.sabadoUtil]).toEqual([5, true]);
    const u = validarLancamento(form({ repetir: "fixa", quando: "ultimo_util", sabadoUtil: "nao" }));
    expect(u.ok && [u.dados.diaUtil, u.dados.sabadoUtil]).toEqual([-1, false]);
  });

  it("parcelado ignora o dia útil", () => {
    const r = validarLancamento(form({ repetir: "temporaria", parcelas: "3", quando: "util", diaUtil: "5" }));
    expect(r.ok && r.dados.diaUtil).toBe(null);
  });

  it("com holerite, o valor vira o líquido", () => {
    const holerite = JSON.stringify({ bruto: 600000, descontos: [{ nome: "INSS", valor: 66000 }, { nome: "IR", valor: 34000 }] });
    const r = validarLancamento(form({ tipo: "entrada", valor: "1", holerite }));
    expect(r.ok && r.dados.valor).toBe(500000);
  });

  it("entrada pode ter valor variável", () => {
    expect(validarLancamento(form({ tipo: "entrada", repetir: "fixa_variavel" })).ok).toBe(true);
  });

  it("aceita repetições", () => {
    expect(validarLancamento(form({ repetir: "fixa" })).ok).toBe(true);
    expect(validarLancamento(form({ repetir: "fixa_variavel" })).ok).toBe(true);
    expect(validarLancamento(form({ tipo: "entrada", repetir: "fixa" })).ok).toBe(true);
    const r = validarLancamento(form({ repetir: "temporaria", parcelas: "10" }));
    expect(r.ok && r.dados.parcelas).toBe(10);
  });

  it("guarda descrição, forma e observação aparadas", () => {
    const r = validarLancamento(form({ descricao: "  Pizza  ", formaPagamentoId: forma, obs: " noite " }));
    expect(r.ok && r.dados).toMatchObject({ descricao: "Pizza", formaPagamentoId: forma, obs: "noite" });
  });

  it.each([
    ["valor zero", { valor: "0" }],
    ["valor negativo", { valor: "-10" }],
    ["valor quebrado", { valor: "45.9" }],
    ["valor vazio", { valor: "" }],
    ["valor gigante", { valor: "1000000000" }],
    ["tipo inválido", { tipo: "transferencia" }],
    ["categoria vazia", { categoriaId: "" }],
    ["categoria não é uuid", { categoriaId: "mercado" }],
    ["forma não é uuid", { formaPagamentoId: "pix" }],
    ["data inexistente", { data: "2026-02-30" }],
    ["descrição longa demais", { descricao: "x".repeat(81) }],
    ["observação longa demais", { obs: "x".repeat(501) }],
    ["repetir inválido", { repetir: "semanal" }],
    ["parcelado sem parcelas", { repetir: "temporaria" }],
    ["parcelado em 1x", { repetir: "temporaria", parcelas: "1" }],
    ["parcelado em 73x", { repetir: "temporaria", parcelas: "73" }],
    ["entrada parcelada", { tipo: "entrada", repetir: "temporaria", parcelas: "3" }],
    ["dia útil 0", { repetir: "fixa", quando: "util", diaUtil: "0" }],
    ["dia útil 30", { repetir: "fixa", quando: "util", diaUtil: "30" }],
    ["quando inválido", { repetir: "fixa", quando: "sempre" }],
    ["holerite em gasto", { holerite: JSON.stringify({ bruto: 500000, descontos: [] }) }],
    ["holerite com descontos maiores que o bruto", { tipo: "entrada", holerite: JSON.stringify({ bruto: 1000, descontos: [{ nome: "INSS", valor: 2000 }] }) }],
  ])("recusa: %s", (_nome, campos) => {
    expect(validarLancamento(form(campos)).ok).toBe(false);
  });
});
