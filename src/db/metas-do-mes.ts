// Metas com o gasto do mês já somado (usado na tela de Metas e no Início)
import { gastoPorCategoria, progressoMeta } from "@/lib/calculos";
import type { Mes } from "@/lib/datas";
import { lancamentosParaCalculo, listarMetas } from "./consultas";

export async function metasDoMes(mes: Mes) {
  const [metas, lancamentos] = await Promise.all([listarMetas(), lancamentosParaCalculo(mes)]);
  const gastos = gastoPorCategoria(lancamentos);
  return metas.map((m) => {
    const gasto = gastos.get(m.categoriaId) ?? 0;
    return { ...m, gasto, ...progressoMeta(gasto, m.limiteMensal) };
  });
}
