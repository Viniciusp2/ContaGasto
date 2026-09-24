import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { montarPlanilha, type LinhaPlanilha } from "./planilha";

const l = (extra: Partial<LinhaPlanilha>): LinhaPlanilha => ({
  data: "2026-09-05",
  dataCompra: null,
  descricao: "x",
  categoriaNome: "Mercado",
  formaNome: null,
  parcela: null,
  totalParcelas: null,
  tipo: "gasto",
  valor: 1000,
  subtipoEntrada: null,
  status: "confirmado",
  formaTipo: null,
  ...extra,
});

describe("planilha do ano", () => {
  it("escreve lançamentos em ordem, com sinal, e o resumo por mês", async () => {
    const buffer = await montarPlanilha(
      2026,
      [
        l({ data: "2026-09-12", descricao: "Mercado", valor: 4590, formaNome: "Pix" }),
        l({ data: "2026-09-05", descricao: "Salário", tipo: "entrada", subtipoEntrada: "salario", valor: 500000, categoriaNome: "Salário" }),
        l({ data: "2026-10-27", dataCompra: "2026-09-23", descricao: "Celular", valor: 15000, parcela: 1, totalParcelas: 10, formaNome: "Crédito" }),
      ],
      10,
    );
    const livro = new ExcelJS.Workbook();
    await livro.xlsx.load(buffer as unknown as ArrayBuffer);

    const aba = livro.getWorksheet("Lançamentos")!;
    expect(aba.getRow(1).getCell(1).value).toBe("Data");
    expect(aba.getRow(2).getCell(2).value).toBe("Salário");
    expect(aba.getRow(2).getCell(6).value).toBe(5000);
    expect(aba.getRow(3).getCell(6).value).toBe(-45.9);
    expect(aba.getRow(4).getCell(8).value).toBe("1/10");
    expect((aba.getRow(4).getCell(9).value as Date).toISOString().slice(0, 10)).toBe("2026-09-23");
    expect((aba.getRow(2).getCell(1).value as Date).toISOString().slice(0, 10)).toBe("2026-09-05");

    const resumo = livro.getWorksheet("Resumo por mês")!;
    expect(resumo.getRow(10).getCell(1).value).toBe("set 2026");
    expect(resumo.getRow(10).getCell(4).value).toBe(4954.1);
    expect(resumo.getRow(11).getCell(3).value).toBe(150);
    expect(resumo.getRow(12).getCell(1).value).toBe("Total");
    expect(resumo.getRow(12).getCell(4).value).toBe(4804.1);
  });
});
