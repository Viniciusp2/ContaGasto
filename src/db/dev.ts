// Área Dev: quantos registros tem cada tabela e os últimos de cada uma (só leitura).
// acesso (senha, segredo, autenticador) e aparelhos_push (chaves do celular) mostram só a contagem.
import { count, desc, getTableColumns } from "drizzle-orm";
import type { PgTable } from "drizzle-orm/pg-core";
import { db } from ".";
import * as schema from "./schema";

const TABELAS: { nome: string; tabela: PgTable; sigilosa?: boolean }[] = [
  { nome: "lancamentos", tabela: schema.lancamentos },
  { nome: "recorrencias", tabela: schema.recorrencias },
  { nome: "categorias", tabela: schema.categorias },
  { nome: "formas_pagamento", tabela: schema.formasPagamento },
  { nome: "contas", tabela: schema.contas },
  { nome: "metas", tabela: schema.metas },
  { nome: "objetivos", tabela: schema.objetivos },
  { nome: "movimentos_objetivo", tabela: schema.movimentosObjetivo },
  { nome: "emprestimos", tabela: schema.emprestimos },
  { nome: "pagamentos_fatura", tabela: schema.pagamentosFatura },
  { nome: "lembretes", tabela: schema.lembretes },
  { nome: "avisos_enviados", tabela: schema.avisosEnviados },
  { nome: "conferencias_ignoradas", tabela: schema.conferenciasIgnoradas },
  { nome: "logs", tabela: schema.logs },
  { nome: "acesso", tabela: schema.acesso, sigilosa: true },
  { nome: "aparelhos_push", tabela: schema.aparelhosPush, sigilosa: true },
];

export type ResumoTabela = { nome: string; total: number; sigilosa: boolean; ultimos: Record<string, unknown>[]; erro?: string };

export async function resumoDasTabelas(quantos = 5): Promise<ResumoTabela[]> {
  return Promise.all(
    TABELAS.map(async ({ nome, tabela, sigilosa = false }) => {
      try {
        const [{ total }] = await db.select({ total: count() }).from(tabela);
        if (sigilosa || total === 0) return { nome, total, sigilosa, ultimos: [] };
        const colunas = getTableColumns(tabela);
        const ordem = "createdAt" in colunas ? desc(colunas.createdAt) : undefined;
        const ultimos = await db.select().from(tabela).orderBy(...(ordem ? [ordem] : [])).limit(quantos);
        return { nome, total, sigilosa, ultimos: ultimos as Record<string, unknown>[] };
      } catch (erro) {
        return { nome, total: 0, sigilosa, ultimos: [], erro: (erro as Error).message.slice(0, 200) };
      }
    }),
  );
}
