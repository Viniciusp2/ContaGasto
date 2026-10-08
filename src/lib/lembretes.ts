// Lembretes (1.7.3, CLAUDE.md 4.16): o que você pede pra lembrar ("pagar o IPVA dia 15", "cobrar o João").
// Funções puras, testadas. Os avisos de cada dia saem de lib/avisos.ts.
import { dataValida, diaCurto, mesDe, somarDias, somarMeses } from "./datas";
import { dataNoMes } from "./recorrencias";

export const REPETICOES = [
  { valor: "nao", rotulo: "Uma vez" },
  { valor: "semanal", rotulo: "Toda semana" },
  { valor: "mensal", rotulo: "Todo mês" },
  { valor: "anual", rotulo: "Todo ano" },
] as const;

export type Repetir = (typeof REPETICOES)[number]["valor"];

export const MAX_TITULO_LEMBRETE = 80;

export function repetirValido(valor: unknown): valor is Repetir {
  return REPETICOES.some((r) => r.valor === valor);
}

// Próxima vez depois de "depoisDe", contando sempre a partir do primeiro dia:
// assim o lembrete do dia 31 cai no dia 28 em fevereiro e volta pro 31 em março
export function proximaVez(inicio: string, repetir: Repetir, depoisDe: string): string | null {
  if (repetir === "nao") return null;
  const dia = Number(inicio.slice(8, 10));
  const mes0 = mesDe(inicio);
  for (let k = 1; k < 6000; k++) {
    const data =
      repetir === "semanal"
        ? somarDias(inicio, 7 * k)
        : repetir === "mensal"
          ? dataNoMes(somarMeses(mes0, k), dia)
          : dataNoMes({ ano: mes0.ano + k, mes: mes0.mes }, dia);
    if (data > depoisDe) return data;
  }
  return null;
}

const DIAS_DA_SEMANA = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

// "uma vez", "toda segunda", "todo mês, dia 15", "todo ano, 15 out"
export function descreverRepeticao(repetir: Repetir, inicio: string): string {
  if (repetir === "semanal") {
    const [a, m, d] = inicio.split("-").map(Number);
    const semana = DIAS_DA_SEMANA[new Date(Date.UTC(a, m - 1, d)).getUTCDay()];
    return semana === "sábado" || semana === "domingo" ? `todo ${semana}` : `toda ${semana}`;
  }
  if (repetir === "mensal") return `todo mês, dia ${Number(inicio.slice(8, 10))}`;
  if (repetir === "anual") return `todo ano, ${diaCurto(inicio).replace(/^\S+,\s*/, "")}`;
  return "uma vez";
}

export type DadosLembrete = { titulo: string; data: string; repetir: Repetir };

// Mesma conferência pro formulário e pro que o assistente propõe
export function conferirLembrete(
  entrada: { titulo: unknown; data: unknown; repetir: unknown },
  hoje: string,
): { ok: true; dados: DadosLembrete } | { ok: false; erro: string } {
  const titulo = typeof entrada.titulo === "string" ? entrada.titulo.trim().replace(/\s+/g, " ") : "";
  if (!titulo) return { ok: false, erro: "Do que é pra lembrar?" };
  if (titulo.length > MAX_TITULO_LEMBRETE) return { ok: false, erro: `O lembrete pode ter até ${MAX_TITULO_LEMBRETE} letras.` };

  const data = typeof entrada.data === "string" ? entrada.data : "";
  if (!dataValida(data)) return { ok: false, erro: "Escolha o dia do lembrete." };
  if (data < hoje) return { ok: false, erro: "Esse dia já passou. Escolha hoje ou um dia que ainda vai chegar." };

  const repetir = entrada.repetir === undefined || entrada.repetir === "" ? "nao" : entrada.repetir;
  if (!repetirValido(repetir)) return { ok: false, erro: "Escolha se o lembrete repete." };

  return { ok: true, dados: { titulo, data, repetir } };
}

export function validarLembrete(fd: FormData, hoje: string) {
  return conferirLembrete({ titulo: fd.get("titulo"), data: fd.get("data"), repetir: fd.get("repetir") ?? "nao" }, hoje);
}

// Marcar como feito: o de uma vez sai da lista; o que repete pula pra próxima vez (depois de hoje,
// mesmo se estava atrasado)
export function aoConcluir(l: { inicio: string; data: string; repetir: Repetir }, hoje: string) {
  const proxima = proximaVez(l.inicio, l.repetir, l.data > hoje ? l.data : hoje);
  return proxima ? { concluido: false, data: proxima } : { concluido: true, data: l.data };
}
