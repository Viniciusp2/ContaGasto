// Planilha Excel do ano (Sprint 4.3): aba de lançamentos e aba de resumo por mês.
import ExcelJS from "exceljs";
import { resumoPorPeriodo, type LancamentoCalculo } from "./calculos";

export type LinhaPlanilha = LancamentoCalculo & {
  data: string;
  dataCompra: string | null;
  descricao: string;
  categoriaNome: string;
  formaNome: string | null;
  parcela: number | null;
  totalParcelas: number | null;
};

const MOEDA = '"R$" #,##0.00;[Red]-"R$" #,##0.00';
const DATA = "dd/mm/yyyy";
const LAVANDA = "FFE0CFE8";

// "2026-09-23" -> Date em UTC (a planilha mostra a data certa, sem fuso)
const paraData = (iso: string) => new Date(`${iso}T12:00:00Z`);

function estilizarCabecalho(aba: ExcelJS.Worksheet) {
  const linha = aba.getRow(1);
  linha.font = { bold: true };
  linha.fill = { type: "pattern", pattern: "solid", fgColor: { argb: LAVANDA } };
  aba.views = [{ state: "frozen", ySplit: 1 }];
}

export async function montarPlanilha(ano: number, linhas: LinhaPlanilha[], mesAtual?: number): Promise<Buffer> {
  const livro = new ExcelJS.Workbook();
  livro.creator = "Bolso";

  const aba = livro.addWorksheet("Lançamentos");
  aba.columns = [
    { header: "Data", key: "data", width: 12, style: { numFmt: DATA } },
    { header: "Descrição", key: "descricao", width: 32 },
    { header: "Categoria", key: "categoria", width: 22 },
    { header: "Tipo", key: "tipo", width: 10 },
    { header: "Forma de pagamento", key: "forma", width: 20 },
    { header: "Valor", key: "valor", width: 14, style: { numFmt: MOEDA } },
    { header: "Situação", key: "situacao", width: 14 },
    { header: "Parcela", key: "parcela", width: 10 },
    { header: "Data da compra", key: "compra", width: 14, style: { numFmt: DATA } },
  ];
  estilizarCabecalho(aba);

  const ordenadas = [...linhas].sort((a, b) => a.data.localeCompare(b.data));
  for (const l of ordenadas) {
    aba.addRow({
      data: paraData(l.data),
      descricao: l.descricao,
      categoria: l.categoriaNome,
      tipo: l.tipo === "gasto" ? "Gasto" : "Entrada",
      forma: l.formaNome ?? "",
      // Gasto negativo, entrada positiva: dá pra somar a coluna direto
      valor: (l.tipo === "gasto" ? -l.valor : l.valor) / 100,
      situacao: l.status === "estimado" ? "Estimado" : "Confirmado",
      parcela: l.parcela && l.totalParcelas ? `${l.parcela}/${l.totalParcelas}` : "",
      compra: l.dataCompra && l.dataCompra !== l.data ? paraData(l.dataCompra) : null,
    });
  }

  const resumo = livro.addWorksheet("Resumo por mês");
  resumo.columns = [
    { header: "Mês", key: "mes", width: 14 },
    { header: "Recebido", key: "entradas", width: 16, style: { numFmt: MOEDA } },
    { header: "Gasto", key: "gasto", width: 16, style: { numFmt: MOEDA } },
    { header: "Sobrou", key: "saldo", width: 16, style: { numFmt: MOEDA } },
  ];
  estilizarCabecalho(resumo);
  const meses = resumoPorPeriodo(linhas, ano, "mes", mesAtual);
  for (const m of meses) {
    resumo.addRow({ mes: m.rotulo, entradas: m.entradas / 100, gasto: m.gasto / 100, saldo: m.saldo / 100 });
  }
  const total = resumoPorPeriodo(linhas, ano, "ano", mesAtual)[0];
  const linhaTotal = resumo.addRow({ mes: "Total", entradas: total.entradas / 100, gasto: total.gasto / 100, saldo: total.saldo / 100 });
  linhaTotal.font = { bold: true };
  resumo.addRow({});
  resumo.addRow({ mes: "Mesmas regras do app: sem estimado, sem empréstimo e sem vale alimentação." });

  return Buffer.from(await livro.xlsx.writeBuffer());
}
