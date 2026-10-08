// Versão do app (semântica: MAIOR.MENOR.CORREÇÃO). Aparece no rodapé de Mais pra conferir o que está no ar.

export type InfoVersao = { versao: string; commit: string; geradoEm: string };

// "Versão 1.2.1 · a1b2c3d · 07/10/2026 20:55"
export function textoVersao({ versao, commit, geradoEm }: InfoVersao): string {
  const partes = [`Versão ${versao}`];
  if (commit) partes.push(commit.slice(0, 7));
  const data = new Date(geradoEm);
  if (!Number.isNaN(data.getTime())) {
    partes.push(
      new Intl.DateTimeFormat("pt-BR", {
        timeZone: "America/Sao_Paulo",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
        .format(data)
        .replace(",", ""),
    );
  }
  return partes.join(" · ");
}

// Preenchidos no build pelo next.config.ts
export const VERSAO_ATUAL: InfoVersao = {
  versao: process.env.NEXT_PUBLIC_BOLSO_VERSAO ?? "dev",
  commit: process.env.NEXT_PUBLIC_BOLSO_COMMIT ?? "",
  geradoEm: process.env.NEXT_PUBLIC_BOLSO_GERADO_EM ?? "",
};
