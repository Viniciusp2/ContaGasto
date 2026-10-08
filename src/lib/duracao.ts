// Quanto tempo o salário e o VA duram, e os dias em que cada um caiu (Sprint 6.4, pedido em 07/10/2026).
import { contaComoGasto, type LancamentoCalculo } from "./calculos";
import { diasNoMes } from "./datas";

type Lanc = LancamentoCalculo & { data: string };

const ehSalario = (l: Lanc) => l.tipo === "entrada" && l.status === "confirmado" && l.subtipoEntrada === "salario";
const ehCreditoVA = (l: Lanc) => l.tipo === "entrada" && l.status === "confirmado" && l.subtipoEntrada === "beneficio";
const ehGastoVA = (l: Lanc) => l.tipo === "gasto" && l.status === "confirmado" && l.formaTipo === "beneficio";
// Crédito pequeno (ex.: "saldo anterior do VA") não é um benefício do mês: fica fora da conta de duração
export const MINIMO_CICLO = 10000;
// "Gastou tudo" na prática: sobrou menos de 5% (no VA sempre ficam uns trocados)
export const QUASE_TUDO = 0.95;

// Dias em que caiu salário ou VA, pra rodear de verde no mapa de calor
export function diasDeEntrada(lancamentos: Lanc[]) {
  const marcados = new Map<string, { salario: boolean; va: boolean }>();
  for (const l of lancamentos) {
    if (!ehSalario(l) && !(ehCreditoVA(l) && l.valor >= MINIMO_CICLO)) continue;
    const m = marcados.get(l.data) ?? { salario: false, va: false };
    if (ehSalario(l)) m.salario = true;
    else m.va = true;
    marcados.set(l.data, m);
  }
  return marcados;
}

function diasEntre(a: string, b: string) {
  const d = (s: string) => Date.UTC(Number(s.slice(0, 4)), Number(s.slice(5, 7)) - 1, Number(s.slice(8, 10)));
  return Math.round((d(b) - d(a)) / 86_400_000);
}

export type Ciclo = {
  data: string; // quando caiu
  valor: number;
  situacao: "acabou" | "sobrou" | "em_andamento";
  dias: number; // acabou: em quantos dias (contando o dia que caiu); senão, quantos dias durou até o próximo ou até hoje
  acabouEm: string | null;
  sobrou: number; // o que não foi gasto até o próximo crédito (ou até hoje)
};

// Pra cada crédito: soma os gastos a partir do dia em que caiu até chegar a 95% do valor. Se o próximo crédito
// chega antes, aquele "sobrou". O último, sem próximo, está em andamento até acabar.
export function quantoDura(lancamentos: Lanc[], qual: "salario" | "va", hoje: string) {
  const creditos = lancamentos
    .filter((l) => (qual === "salario" ? ehSalario(l) : ehCreditoVA(l) && l.valor >= MINIMO_CICLO))
    .sort((a, b) => a.data.localeCompare(b.data));
  const gastos = lancamentos
    .filter((l) => (qual === "salario" ? contaComoGasto(l) : ehGastoVA(l)))
    .sort((a, b) => a.data.localeCompare(b.data));

  const ciclos: Ciclo[] = creditos.map((c, i) => {
    const proximo = creditos[i + 1]?.data ?? null;
    let soma = 0;
    for (const g of gastos) {
      if (g.data < c.data) continue;
      if (proximo && g.data >= proximo) break;
      soma += g.valor;
      if (soma >= Math.ceil(c.valor * QUASE_TUDO)) {
        return { data: c.data, valor: c.valor, situacao: "acabou", dias: diasEntre(c.data, g.data) + 1, acabouEm: g.data, sobrou: Math.max(0, c.valor - soma) };
      }
    }
    const fim = proximo ?? hoje;
    return {
      data: c.data,
      valor: c.valor,
      situacao: proximo ? "sobrou" : "em_andamento",
      dias: diasEntre(c.data, fim) + (proximo ? 0 : 1),
      acabouEm: null,
      sobrou: c.valor - soma,
    };
  });

  const acabaram = ciclos.filter((c) => c.situacao === "acabou");
  const mediaDias = acabaram.length > 0 ? Math.round(acabaram.reduce((s, c) => s + c.dias, 0) / acabaram.length) : null;
  return { ciclos, mediaDias, acabaram: acabaram.length };
}

// Mapa de calor do ano: um calendário pequeno por mês. Os níveis vêm da posição do dia entre os dias com gasto
// (quintis), não da proporção do maior: um aluguel não apaga o resto do ano.
export function mapaDoAno(lancamentos: Lanc[], ano: number, ateMes: number) {
  const soma = new Map<string, number>();
  for (const l of lancamentos) if (contaComoGasto(l)) soma.set(l.data, (soma.get(l.data) ?? 0) + l.valor);
  // Nível 1 a 4 pela posição na fila dos dias com gasto (empate fica no nível mais baixo)
  const valores = [...soma.values()].sort((a, b) => a - b);
  const nivel = (v: number) => (v === 0 ? 0 : 1 + Math.floor((valores.indexOf(v) / valores.length) * 4));

  return Array.from({ length: ateMes }, (_, i) => {
    const mes = { ano, mes: i + 1 };
    const prefixo = `${ano}-${String(i + 1).padStart(2, "0")}`;
    const dias = Array.from({ length: diasNoMes(mes) }, (_, d) => {
      const data = `${prefixo}-${String(d + 1).padStart(2, "0")}`;
      const valor = soma.get(data) ?? 0;
      return { dia: d + 1, data, valor, nivel: nivel(valor) };
    });
    return { mes: i + 1, vazias: new Date(Date.UTC(ano, i, 1)).getUTCDay(), dias };
  });
}
