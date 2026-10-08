"use server";

import { revalidatePath } from "next/cache";
import { apagarTodosOsLogs, registrar } from "@/db/logs";
import { criarProvedor, lerConfigEscolhida } from "@/lib/ia";

export type ResultadoTeste = { ok: boolean; ms?: number; texto: string };

// Testa uma IA de verdade com uma pergunta mínima (sem ferramentas, sem dado seu). Grava no log.
export async function testarIA(nome: string): Promise<ResultadoTeste> {
  const lida = lerConfigEscolhida(process.env, nome);
  if (!lida.ok) return { ok: false, texto: lida.erro };
  const { config } = lida;
  const inicio = Date.now();
  try {
    const r = await criarProvedor(config).conversar({
      sistema: "Você está sendo testado. Responda só com a palavra: ok",
      mensagens: [{ papel: "usuario", texto: "teste" }],
      ferramentas: [],
      maxTokens: 512,
    });
    const ms = Date.now() - inicio;
    const texto = r.texto.trim().slice(0, 120) || "(respondeu vazio)";
    await registrar("info", "dev", `Teste: ${config.rotulo} respondeu em ${(ms / 1000).toFixed(1)}s`, {
      ia: config.nome,
      modelo: config.modelo,
      ms,
      resposta: texto,
      tokensEntrada: r.tokens.entrada,
      tokensSaida: r.tokens.saida,
    });
    revalidatePath("/dev");
    return { ok: true, ms, texto };
  } catch (erro) {
    const ms = Date.now() - inicio;
    const texto = (erro as Error).message.slice(0, 400);
    await registrar("erro", "dev", `Teste: ${config.rotulo} falhou`, { ia: config.nome, modelo: config.modelo, ms, erro: texto });
    revalidatePath("/dev");
    return { ok: false, ms, texto };
  }
}

export async function apagarLogs() {
  await apagarTodosOsLogs();
  revalidatePath("/dev");
}
