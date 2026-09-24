// Qual banco usar. A integração Neon da Vercel pode criar as variáveis com prefixo (ex. neon_DATABASE_URL),
// então aceita os nomes mais comuns. Sem nenhum, usa o banco local, mas nunca na Vercel:
// lá o disco some a cada deploy e os dados se perderiam sem ninguém perceber.
const NOMES = ["DATABASE_URL", "neon_DATABASE_URL", "POSTGRES_URL", "neon_POSTGRES_URL"] as const;

export function urlDoBanco(env: Record<string, string | undefined>): { url: string | null; erro: string | null } {
  for (const nome of NOMES) {
    const valor = env[nome]?.trim();
    if (valor) return { url: valor, erro: null };
  }
  if (env.VERCEL) {
    return { url: null, erro: "Banco não configurado na Vercel: cadastre DATABASE_URL (a do Neon)." };
  }
  return { url: null, erro: null };
}
