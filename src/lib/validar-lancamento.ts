import { dataValida } from "./datas";
import { MAX_CENTAVOS } from "./dinheiro";

export type DadosLancamento = {
  tipo: "gasto" | "entrada";
  valor: number;
  data: string;
  categoriaId: string;
  formaPagamentoId: string | null;
  descricao: string; // vazio = usar o nome da categoria
  obs: string | null;
};

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

  return {
    ok: true,
    dados: { tipo, valor, data, categoriaId, formaPagamentoId: formaPagamentoId || null, descricao, obs: obs || null },
  };
}
