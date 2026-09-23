import { dataValida } from "./datas";
import { MAX_CENTAVOS } from "./dinheiro";
import { lerHolerite, liquidoDoHolerite, type Holerite } from "./holerite";

export type DadosLancamento = {
  tipo: "gasto" | "entrada";
  valor: number;
  data: string;
  categoriaId: string;
  formaPagamentoId: string | null;
  descricao: string; // vazio = usar o nome da categoria
  obs: string | null;
  repetir: Repetir;
  parcelas: number | null; // só no parcelado
  diaUtil: number | null; // Nº dia útil, -1 = último, null = dia fixo
  sabadoUtil: boolean;
  holerite: Holerite | null;
};

export const MAX_DIA_UTIL = 22;

export type Repetir = "unico" | "fixa" | "fixa_variavel" | "temporaria";

const REPETIR: Repetir[] = ["unico", "fixa", "fixa_variavel", "temporaria"];
export const MAX_PARCELAS = 72;

export type Resultado = { ok: true; dados: DadosLancamento } | { ok: false; erro: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const ehUuid = (texto: string) => UUID.test(texto);

const texto = (formData: FormData, campo: string) => String(formData.get(campo) ?? "").trim();

// Confere só o formato. Se a categoria existe e bate com o tipo, quem decide é o banco (na action).
export function validarLancamento(formData: FormData): Resultado {
  const tipo = texto(formData, "tipo");
  if (tipo !== "gasto" && tipo !== "entrada") return { ok: false, erro: "Escolha gasto ou entrada." };

  const valor = Number(texto(formData, "valor"));
  if (!Number.isInteger(valor) || valor <= 0) return { ok: false, erro: "Digite um valor maior que zero." };
  if (valor > MAX_CENTAVOS) return { ok: false, erro: "Esse valor é grande demais." };

  const categoriaId = texto(formData, "categoriaId");
  if (!ehUuid(categoriaId)) return { ok: false, erro: "Escolha uma categoria." };

  const formaPagamentoId = texto(formData, "formaPagamentoId");
  if (formaPagamentoId && !ehUuid(formaPagamentoId)) return { ok: false, erro: "Forma de pagamento inválida." };

  const data = texto(formData, "data");
  if (!dataValida(data)) return { ok: false, erro: "Data inválida." };

  const descricao = texto(formData, "descricao");
  if (descricao.length > 80) return { ok: false, erro: "A descrição pode ter até 80 letras." };

  const obs = texto(formData, "obs");
  if (obs.length > 500) return { ok: false, erro: "A observação pode ter até 500 letras." };

  const repetir = (texto(formData, "repetir") || "unico") as Repetir;
  if (!REPETIR.includes(repetir)) return { ok: false, erro: "Escolha como repete." };
  if (tipo === "entrada" && repetir === "temporaria") {
    return { ok: false, erro: "Entrada não pode ser parcelada." };
  }

  // Que dia cai: dia fixo do mês, Nº dia útil ou último dia útil (só fixo e fixa variável)
  let diaUtil: number | null = null;
  const quando = texto(formData, "quando") || "dia";
  if (repetir === "fixa" || repetir === "fixa_variavel") {
    if (quando === "ultimo_util") diaUtil = -1;
    else if (quando === "util") {
      diaUtil = Number(texto(formData, "diaUtil"));
      if (!Number.isInteger(diaUtil) || diaUtil < 1 || diaUtil > MAX_DIA_UTIL) {
        return { ok: false, erro: `Dia útil vai de 1 a ${MAX_DIA_UTIL}.` };
      }
    } else if (quando !== "dia") return { ok: false, erro: "Escolha em que dia cai." };
  }
  const sabadoUtil = texto(formData, "sabadoUtil") !== "nao";

  // Holerite só em entrada. Com ele, o valor é sempre o líquido.
  let holerite: Holerite | null = null;
  const jsonHolerite = texto(formData, "holerite");
  if (jsonHolerite) {
    if (tipo !== "entrada") return { ok: false, erro: "Holerite é só pra entrada." };
    const lido = lerHolerite(jsonHolerite);
    if (!lido.ok) return { ok: false, erro: lido.erro };
    holerite = lido.holerite;
  }
  const valorFinal = holerite ? liquidoDoHolerite(holerite) : valor;

  let parcelas: number | null = null;
  if (repetir === "temporaria") {
    parcelas = Number(texto(formData, "parcelas"));
    if (!Number.isInteger(parcelas) || parcelas < 2 || parcelas > MAX_PARCELAS) {
      return { ok: false, erro: `Parcelado vai de 2 a ${MAX_PARCELAS} vezes.` };
    }
  }

  return {
    ok: true,
    dados: {
      tipo,
      valor: valorFinal,
      data,
      categoriaId,
      formaPagamentoId: formaPagamentoId || null,
      descricao,
      obs: obs || null,
      repetir,
      parcelas,
      diaUtil,
      sabadoUtil,
      holerite,
    },
  };
}
