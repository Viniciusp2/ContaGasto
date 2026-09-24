import { lancamentosParaPlanilha } from "@/db/consultas";
import { hojeISO } from "@/lib/datas";
import { montarPlanilha } from "@/lib/planilha";

// Baixa a planilha do ano: /exportar/excel?ano=2026
export async function GET(request: Request) {
  const hoje = hojeISO();
  const anoAtual = Number(hoje.slice(0, 4));
  const lido = Number(new URL(request.url).searchParams.get("ano"));
  const ano = Number.isInteger(lido) && lido >= 2000 && lido <= 2100 ? lido : anoAtual;

  const linhas = await lancamentosParaPlanilha(ano);
  const buffer = await montarPlanilha(ano, linhas, ano === anoAtual ? Number(hoje.slice(5, 7)) : undefined);

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="bolso-${ano}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
