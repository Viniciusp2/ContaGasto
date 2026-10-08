"use server";

import { revalidatePath } from "next/cache";
import { restaurarTudo } from "@/db/backup";
import { apagarManuaisDuplicados, importarLinhas, procurarManuaisDuplicados } from "@/db/importacao";
import { lerBackup } from "@/lib/backup";
import { lerImportacao } from "@/lib/importacao";

export type EstadoRestaurar = { erro?: string; ok?: string };

const PALAVRA_CONFIRMA = "RESTAURAR";
const TAMANHO_MAXIMO = 20 * 1024 * 1024; // 20 MB

// Substitui todos os dados pelos do backup. Pede a palavra de confirmação digitada.
export async function restaurarBackup(_: EstadoRestaurar, formData: FormData): Promise<EstadoRestaurar> {
  if (String(formData.get("confirmacao") ?? "").trim().toUpperCase() !== PALAVRA_CONFIRMA) {
    return { erro: `Digite ${PALAVRA_CONFIRMA} pra confirmar.` };
  }
  const arquivo = formData.get("arquivo");
  if (!(arquivo instanceof File) || arquivo.size === 0) return { erro: "Escolha o arquivo de backup." };
  if (arquivo.size > TAMANHO_MAXIMO) return { erro: "Arquivo grande demais." };

  const lido = lerBackup(await arquivo.text());
  if (!lido.ok) return { erro: lido.erro };

  try {
    await restaurarTudo(lido.backup);
  } catch {
    return { erro: "Não deu pra restaurar esse backup. Nada foi mudado." };
  }
  revalidatePath("/", "layout");
  return { ok: `Backup restaurado: ${lido.linhas} registros.` };
}

export type EstadoImportar = { erro?: string; ok?: string };

// Importa lançamentos de um arquivo (ex.: extrato do banco). Só adiciona; o que já existe é pulado.
export async function importarLancamentos(_: EstadoImportar, formData: FormData): Promise<EstadoImportar> {
  const arquivo = formData.get("arquivo");
  if (!(arquivo instanceof File) || arquivo.size === 0) return { erro: "Escolha o arquivo." };
  if (arquivo.size > TAMANHO_MAXIMO) return { erro: "Arquivo grande demais." };

  const lido = lerImportacao(await arquivo.text());
  if (!lido.ok) return { erro: lido.erro };

  try {
    const r = await importarLinhas(lido.linhas);
    revalidatePath("/", "layout");
    const meses = r.meses.length > 0 ? ` (${r.meses.join(", ")})` : "";
    return {
      ok:
        `${r.importados} lançamento${r.importados === 1 ? "" : "s"} importado${r.importados === 1 ? "" : "s"}${meses}.` +
        (r.completados > 0
          ? ` ${r.completados} já estava${r.completados === 1 ? "" : "m"} lançado${r.completados === 1 ? "" : "s"} por você e só ganharam banco e descrição${r.pagas > 0 ? ` (${r.pagas} conta${r.pagas === 1 ? "" : "s"} marcada${r.pagas === 1 ? "" : "s"} como paga${r.pagas === 1 ? "" : "s"})` : ""}.`
          : "") +
        (r.copiasApagadas > 0 ? ` ${r.copiasApagadas} cópia${r.copiasApagadas === 1 ? "" : "s"} a mais de importação apagada${r.copiasApagadas === 1 ? "" : "s"}.` : "") +
        (r.repetidos > 0 ? ` ${r.repetidos} já estava${r.repetidos === 1 ? "" : "m"} no app e ficaram de fora.` : ""),
    };
  } catch {
    return { erro: "Não deu pra importar. Nada foi mudado." };
  }
}

export type ParDuplicado = {
  manual: { id: string; data: string; valor: number; tipo: string; descricao: string };
  extrato: { id: string; data: string; valor: number; tipo: string; descricao: string; contaNome: string | null };
};
export type EstadoDuplicados = { erro?: string; ok?: string; pares?: ParDuplicado[] };

// Passo 1: só procura e mostra. Nada é apagado aqui.
export async function procurarDuplicados(): Promise<EstadoDuplicados> {
  const pares = await procurarManuaisDuplicados();
  if (pares.length === 0) return { ok: "Nenhum lançamento seu em dobro com o extrato." };
  return { pares };
}

// Passo 2: apaga os seus (manuais ou de fixo) que você viu na lista. O do extrato fica.
export async function apagarDuplicados(_: EstadoDuplicados, formData: FormData): Promise<EstadoDuplicados> {
  const ids = formData.getAll("id").map(String);
  if (ids.length === 0) return { erro: "Nada pra apagar." };
  const apagados = await apagarManuaisDuplicados(ids);
  revalidatePath("/", "layout");
  return { ok: `${apagados} lançamento${apagados === 1 ? "" : "s"} em dobro apagado${apagados === 1 ? "" : "s"}. Ficaram os do extrato.` };
}
