"use server";

import { revalidatePath } from "next/cache";
import { restaurarTudo } from "@/db/backup";
import { importarLinhas } from "@/db/importacao";
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
        (r.repetidos > 0 ? ` ${r.repetidos} já estava${r.repetidos === 1 ? "" : "m"} no app e ficaram de fora.` : ""),
    };
  } catch {
    return { erro: "Não deu pra importar. Nada foi mudado." };
  }
}
