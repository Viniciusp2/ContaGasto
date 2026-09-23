// Datas do app são strings "YYYY-MM-DD" (sem horário, sem fuso). Meses são "YYYY-MM".

export type Mes = { ano: number; mes: number }; // mes de 1 a 12

const FUSO = "America/Sao_Paulo";

// Hoje no fuso do Brasil, não no do servidor (na Vercel o servidor roda em UTC)
export function hojeISO(agora = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: FUSO }).format(agora);
}

export function mesDe(dataISO: string): Mes {
  return { ano: Number(dataISO.slice(0, 4)), mes: Number(dataISO.slice(5, 7)) };
}

// Lê "2026-09" da URL. Qualquer coisa inválida cai no mês de hoje.
export function lerMes(texto: string | undefined, hoje = hojeISO()): Mes {
  const m = texto?.match(/^(\d{4})-(\d{2})$/);
  if (m) {
    const mes = Number(m[2]);
    if (mes >= 1 && mes <= 12) return { ano: Number(m[1]), mes };
  }
  return mesDe(hoje);
}

export function mesParaTexto({ ano, mes }: Mes): string {
  return `${ano}-${String(mes).padStart(2, "0")}`;
}

export function somarMeses({ ano, mes }: Mes, delta: number): Mes {
  const indice = ano * 12 + (mes - 1) + delta;
  return { ano: Math.floor(indice / 12), mes: (indice % 12) + 1 };
}

export function diasNoMes({ ano, mes }: Mes): number {
  return new Date(Date.UTC(ano, mes, 0)).getUTCDate();
}

// Primeiro e último dia do mês, os dois inclusos
export function intervaloDoMes(m: Mes) {
  const prefixo = mesParaTexto(m);
  return { inicio: `${prefixo}-01`, fim: `${prefixo}-${String(diasNoMes(m)).padStart(2, "0")}` };
}

export function dataValida(texto: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(texto)) return false;
  const [ano, mes, dia] = texto.split("-").map(Number);
  const d = new Date(Date.UTC(ano, mes - 1, dia));
  return d.getUTCFullYear() === ano && d.getUTCMonth() === mes - 1 && d.getUTCDate() === dia;
}

function emUTC(dataISO: string) {
  const [ano, mes, dia] = dataISO.split("-").map(Number);
  return new Date(Date.UTC(ano, mes - 1, dia));
}

// "setembro de 2026"
export function nomeDoMes(m: Mes): string {
  return new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(Date.UTC(m.ano, m.mes - 1, 1)),
  );
}

// "qua, 23 set"
export function diaCurto(dataISO: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  })
    .format(emUTC(dataISO))
    .replace(/\./g, "")
    .replace(" de ", " ");
}
