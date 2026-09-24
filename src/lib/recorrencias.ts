// Recorrências e fatura do cartão (CLAUDE.md, 4.3, 4.4 e 4.8). Funções puras, testadas.
import { diasNoMes, mesDe, mesParaTexto, somarMeses, type Mes } from "./datas";
import { diaUtilDoMes } from "./dias-uteis";

export type Cartao = { diaFechamento: number | null; diaVencimento: number | null } | null;

export type RecorrenciaBase = {
  tipo: "fixa" | "fixa_variavel" | "temporaria";
  diaDoMes: number;
  dataInicio: string; // data da primeira ocorrência (a compra, no parcelado)
  dataFim: string | null; // encerrada: nada depois disso é gerado
  totalParcelas: number | null;
  geradaAte: string | null; // "YYYY-MM" da última competência já gerada
  diaUtil: number | null; // Nº dia útil (-1 = último). Null = cai no diaDoMes.
  sabadoUtil: boolean;
};

export type Ocorrencia = {
  competencia: string; // "YYYY-MM" da ocorrência (a chave anti-duplicação)
  dataCompra: string;
  data: string; // quando o dinheiro sai (no crédito, o vencimento da fatura)
  parcela: number | null;
};

// Dia que não existe no mês cai no último dia (31 em fevereiro vira 28 ou 29)
export function dataNoMes(m: Mes, dia: number): string {
  const d = Math.min(dia, diasNoMes(m));
  return `${mesParaTexto(m)}-${String(d).padStart(2, "0")}`;
}

const diaDe = (dataISO: string) => Number(dataISO.slice(8, 10));

const mesesEntre = (de: Mes, ate: Mes) => (ate.ano - de.ano) * 12 + (ate.mes - de.mes);

export function cartaoConfigurado(cartao: Cartao): cartao is { diaFechamento: number; diaVencimento: number } {
  return Boolean(cartao && cartao.diaFechamento && cartao.diaVencimento);
}

// Mês da fatura em que a compra entra: até o dia de fechamento, a deste mês; depois, a do próximo
function mesDaFatura(dataCompra: string, diaFechamento: number): Mes {
  const m = mesDe(dataCompra);
  const fechamento = Math.min(diaFechamento, diasNoMes(m));
  return diaDe(dataCompra) <= fechamento ? m : somarMeses(m, 1);
}

// Vencimento da fatura que fecha no mês "mesFatura"
function vencimentoDaFatura(mesFatura: Mes, diaFechamento: number, diaVencimento: number): string {
  const mesVence = diaVencimento > diaFechamento ? mesFatura : somarMeses(mesFatura, 1);
  return dataNoMes(mesVence, diaVencimento);
}

// Data em que um gasto sai do bolso: no crédito com dias configurados, o vencimento da fatura
export function dataEfetiva(dataCompra: string, cartao: Cartao): string {
  if (!cartaoConfigurado(cartao)) return dataCompra;
  const mesFatura = mesDaFatura(dataCompra, cartao.diaFechamento);
  return vencimentoDaFatura(mesFatura, cartao.diaFechamento, cartao.diaVencimento);
}

// A k-ésima ocorrência (k = 0 é a primeira)
export function ocorrencia(rec: RecorrenciaBase, k: number, cartao: Cartao): Ocorrencia {
  const mes0 = mesDe(rec.dataInicio);
  const mes = somarMeses(mes0, k);
  const dataCompra =
    rec.diaUtil !== null
      ? diaUtilDoMes(mes, rec.diaUtil, rec.sabadoUtil)
      : k === 0
        ? rec.dataInicio
        : dataNoMes(mes, rec.diaDoMes);

  let data = dataCompra;
  if (cartaoConfigurado(cartao)) {
    // Conta a partir da fatura da primeira ocorrência, pra dia 31 em mês curto não pular fatura
    const mesFatura = somarMeses(mesDaFatura(rec.dataInicio, cartao.diaFechamento), k);
    data = vencimentoDaFatura(mesFatura, cartao.diaFechamento, cartao.diaVencimento);
  }

  return {
    competencia: mesParaTexto(mes),
    dataCompra,
    data,
    parcela: rec.tipo === "temporaria" ? k + 1 : null,
  };
}

function primeiroIndicePendente(rec: RecorrenciaBase): number {
  if (!rec.geradaAte) return 0;
  const [ano, mes] = rec.geradaAte.split("-").map(Number);
  return mesesEntre(mesDe(rec.dataInicio), { ano, mes }) + 1;
}

function acabou(rec: RecorrenciaBase, k: number, o: Ocorrencia): boolean {
  if (rec.tipo === "temporaria" && k >= (rec.totalParcelas ?? 0)) return true;
  return rec.dataFim !== null && o.dataCompra > rec.dataFim;
}

const LIMITE = 600; // 50 anos, só pra nunca travar num loop

// Ocorrências que já chegaram (data <= hoje) e ainda não viraram lançamento
export function ocorrenciasPendentes(rec: RecorrenciaBase, cartao: Cartao, hoje: string): Ocorrencia[] {
  const pendentes: Ocorrencia[] = [];
  for (let k = primeiroIndicePendente(rec); k < LIMITE; k++) {
    const o = ocorrencia(rec, k, cartao);
    if (acabou(rec, k, o) || o.data > hoje) break;
    pendentes.push(o);
  }
  return pendentes;
}

// Próxima ocorrência que ainda vai cair (null se a recorrência acabou)
export function proximaOcorrencia(rec: RecorrenciaBase, cartao: Cartao, hoje: string): Ocorrencia | null {
  for (let k = primeiroIndicePendente(rec); k < LIMITE; k++) {
    const o = ocorrencia(rec, k, cartao);
    if (acabou(rec, k, o)) return null;
    if (o.data > hoje) return o;
  }
  return null;
}

// Quantas ocorrências já viraram lançamento
export function quantasGeradas(rec: RecorrenciaBase): number {
  return primeiroIndicePendente(rec);
}

// Primeira ocorrência de uma regra de dia útil a partir de uma data (se já passou no mês, vai pro próximo)
export function primeiroDiaUtilAPartirDe(dataISO: string, n: number, sabadoUtil: boolean): string {
  const mes = mesDe(dataISO);
  const nesteMes = diaUtilDoMes(mes, n, sabadoUtil);
  return nesteMes >= dataISO ? nesteMes : diaUtilDoMes(somarMeses(mes, 1), n, sabadoUtil);
}

// "5º dia útil", "último dia útil", "dia 10"
export function descreverDia(rec: Pick<RecorrenciaBase, "diaUtil" | "diaDoMes">): string {
  if (rec.diaUtil === -1) return "último dia útil";
  if (rec.diaUtil !== null) return `${rec.diaUtil}º dia útil`;
  return `dia ${rec.diaDoMes}`;
}

// Fixa variável: média dos últimos N valores confirmados (mais recente primeiro). Sem histórico, o valor digitado.
export function mediaEstimada(confirmadosRecentes: number[], meses: number, valorInicial: number): number {
  const ultimos = confirmadosRecentes.slice(0, Math.max(1, meses));
  if (ultimos.length === 0) return valorInicial;
  return Math.round(ultimos.reduce((a, b) => a + b, 0) / ultimos.length);
}

// Ocorrências que ainda não viraram lançamento e caem depois de "de" até "ate" (inclusive).
// Base dos compromissos do mês e do comprometido no próximo mês.
export function ocorrenciasNoIntervalo(rec: RecorrenciaBase, cartao: Cartao, de: string, ate: string): Ocorrencia[] {
  const lista: Ocorrencia[] = [];
  for (let k = primeiroIndicePendente(rec); k < LIMITE; k++) {
    const o = ocorrencia(rec, k, cartao);
    if (acabou(rec, k, o) || o.data > ate) break;
    if (o.data > de) lista.push(o);
  }
  return lista;
}

// Conta variável confirmada comparada com a média dos meses anteriores (4.8: "R$ 18 acima da média").
// "anteriores" são os valores confirmados antes deste, do mais recente pro mais antigo.
export function comparacaoComMedia(valor: number, anteriores: number[], meses: number) {
  const base = anteriores.slice(0, Math.max(1, meses));
  if (base.length === 0) return null;
  const media = Math.round(base.reduce((a, b) => a + b, 0) / base.length);
  return { media, diferenca: valor - media };
}

// Retomar um fixo pausado: marca como já gerado tudo que caiu até hoje, pra não cobrar os meses parados.
// Devolve o novo "gerada_ate" (ou o atual, se nada caiu durante a pausa).
export function geradaAteAoRetomar(rec: RecorrenciaBase, cartao: Cartao, hoje: string): string | null {
  let ultima = rec.geradaAte;
  for (let k = primeiroIndicePendente(rec); k < LIMITE; k++) {
    const o = ocorrencia(rec, k, cartao);
    if (acabou(rec, k, o) || o.data > hoje) break;
    ultima = o.competencia;
  }
  return ultima;
}
