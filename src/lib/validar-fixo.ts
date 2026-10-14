// Editar um fixo ou parcelado (1.6.5). Só confere o formato; se categoria, forma e banco existem, quem vê é a action.
import { tipoContaValido, type TipoConta } from "./contas";
import { MAX_CENTAVOS } from "./dinheiro";
import { ehUuid, MAX_DIA_UTIL, MAX_PARCELAS } from "./validar-lancamento";

export type EdicaoFixo = {
  descricao: string;
  valor: number;
  categoriaId: string;
  formaPagamentoId: string | null;
  contaId: string | null;
  diaDoMes: number;
  diaUtil: number | null; // Nº dia útil, -1 = último, null = dia fixo
  sabadoUtil: boolean;
  totalParcelas: number | null; // só no parcelado
  tipoConta: TipoConta | null;
  automatico: boolean;
  aplicarNasAbertas: boolean; // levar as mudanças pras que ainda estão a pagar
};

const texto = (fd: FormData, campo: string) => String(fd.get(campo) ?? "").trim();

export function validarEdicaoFixo(
  fd: FormData,
  atual: { tipo: "fixa" | "fixa_variavel" | "temporaria"; parcelasGeradas: number },
): { ok: true; dados: EdicaoFixo } | { ok: false; erro: string } {
  const descricao = texto(fd, "descricao").replace(/\s+/g, " ");
  if (!descricao || descricao.length > 80) return { ok: false, erro: "A descrição precisa ter de 1 a 80 letras." };

  const valor = Number(texto(fd, "valor"));
  if (!Number.isInteger(valor) || valor <= 0 || valor > MAX_CENTAVOS) return { ok: false, erro: "Digite um valor maior que zero." };

  const categoriaId = texto(fd, "categoriaId");
  if (!ehUuid(categoriaId)) return { ok: false, erro: "Escolha uma categoria." };
  const formaPagamentoId = texto(fd, "formaPagamentoId");
  if (formaPagamentoId && !ehUuid(formaPagamentoId)) return { ok: false, erro: "Forma de pagamento inválida." };
  const contaId = texto(fd, "contaId");
  if (contaId && !ehUuid(contaId)) return { ok: false, erro: "Banco inválido." };

  // Dia: no parcelado segue o dia da compra (não muda aqui); no fixo, dia do mês, Nº dia útil ou último dia útil
  let diaDoMes = Number(texto(fd, "diaDoMes"));
  let diaUtil: number | null = null;
  if (atual.tipo !== "temporaria") {
    const quando = texto(fd, "quando") || "dia";
    if (quando === "ultimo_util") diaUtil = -1;
    else if (quando === "util") {
      diaUtil = Number(texto(fd, "diaUtil"));
      if (!Number.isInteger(diaUtil) || diaUtil < 1 || diaUtil > MAX_DIA_UTIL) return { ok: false, erro: `Dia útil vai de 1 a ${MAX_DIA_UTIL}.` };
    } else if (quando !== "dia") return { ok: false, erro: "Escolha em que dia cai." };
  }
  if (!Number.isInteger(diaDoMes) || diaDoMes < 1 || diaDoMes > 31) {
    if (diaUtil === null) return { ok: false, erro: "O dia do mês vai de 1 a 31." };
    diaDoMes = 1;
  }

  let totalParcelas: number | null = null;
  if (atual.tipo === "temporaria") {
    totalParcelas = Number(texto(fd, "totalParcelas"));
    if (!Number.isInteger(totalParcelas) || totalParcelas < 2 || totalParcelas > MAX_PARCELAS) {
      return { ok: false, erro: `Parcelado vai de 2 a ${MAX_PARCELAS} vezes.` };
    }
    if (totalParcelas < atual.parcelasGeradas) {
      return { ok: false, erro: `Já caíram ${atual.parcelasGeradas} parcelas: o total não pode ser menor que isso.` };
    }
  }

  const tipoContaTexto = texto(fd, "tipoConta");
  if (tipoContaTexto && !tipoContaValido(tipoContaTexto)) return { ok: false, erro: "Tipo de conta inválido." };

  return {
    ok: true,
    dados: {
      descricao,
      valor,
      categoriaId,
      formaPagamentoId: formaPagamentoId || null,
      contaId: contaId || null,
      diaDoMes,
      diaUtil,
      sabadoUtil: texto(fd, "sabadoUtil") !== "nao",
      totalParcelas,
      tipoConta: tipoContaTexto ? (tipoContaTexto as TipoConta) : null,
      automatico: texto(fd, "automatico") === "sim",
      aplicarNasAbertas: texto(fd, "aplicarNasAbertas") !== "nao",
    },
  };
}

// Apagar fixo: o que fazer com o que ele já gerou
export const MODOS_APAGAR = ["manter", "abertos", "tudo"] as const;
export type ModoApagar = (typeof MODOS_APAGAR)[number];
export const lerModoApagar = (t: string): ModoApagar | null => (MODOS_APAGAR as readonly string[]).includes(t) ? (t as ModoApagar) : null;
