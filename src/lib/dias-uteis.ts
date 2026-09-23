// Dias úteis (CLAUDE.md 4.3): segunda a sábado (sábado opcional), sem domingo e sem feriado nacional.
import { diasNoMes, mesParaTexto, type Mes } from "./datas";

// Feriados nacionais de data fixa (lei 662/49, 6.802/80 e 14.759/23)
const FIXOS = ["01-01", "04-21", "05-01", "09-07", "10-12", "11-02", "11-15", "11-20", "12-25"];

// Domingo de Páscoa (algoritmo de Meeus/Jones/Butcher)
export function pascoa(ano: number): string {
  const a = ano % 19;
  const b = Math.floor(ano / 100);
  const c = ano % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31);
  const dia = ((h + l - 7 * m + 114) % 31) + 1;
  return `${ano}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
}

function sextaSanta(ano: number): string {
  const d = new Date(`${pascoa(ano)}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 2);
  return d.toISOString().slice(0, 10);
}

export function ehFeriadoNacional(dataISO: string): boolean {
  return FIXOS.includes(dataISO.slice(5)) || dataISO === sextaSanta(Number(dataISO.slice(0, 4)));
}

export function ehDiaUtil(dataISO: string, sabadoConta: boolean): boolean {
  const semana = new Date(`${dataISO}T00:00:00Z`).getUTCDay(); // 0 = domingo, 6 = sábado
  if (semana === 0 || (semana === 6 && !sabadoConta)) return false;
  return !ehFeriadoNacional(dataISO);
}

// Nº dia útil do mês. n = -1 é o último. Se o mês não tiver tantos dias úteis, fica o último.
export function diaUtilDoMes(m: Mes, n: number, sabadoConta: boolean): string {
  const total = diasNoMes(m);
  const data = (dia: number) => `${mesParaTexto(m)}-${String(dia).padStart(2, "0")}`;
  const uteis: string[] = [];
  for (let dia = 1; dia <= total; dia++) {
    if (ehDiaUtil(data(dia), sabadoConta)) uteis.push(data(dia));
  }
  if (n === -1 || n > uteis.length) return uteis.at(-1)!;
  return uteis[n - 1];
}
