import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import type { NextConfig } from "next";

// Versão do package.json + commit + hora do build, pro rodapé de Mais (dá pra ver se a versão nova já está no ar)
const { version } = JSON.parse(readFileSync("./package.json", "utf8")) as { version: string };
function commitAtual() {
  if (process.env.VERCEL_GIT_COMMIT_SHA) return process.env.VERCEL_GIT_COMMIT_SHA;
  try {
    return execSync("git rev-parse HEAD", { stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
  } catch {
    return "";
  }
}

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_BOLSO_VERSAO: version,
    NEXT_PUBLIC_BOLSO_COMMIT: commitAtual(),
    NEXT_PUBLIC_BOLSO_GERADO_EM: new Date().toISOString(),
  },
  // PGlite carrega WASM, então fica fora do bundle do servidor
  serverExternalPackages: ["@electric-sql/pglite"],
  // Libera abrir o next dev pelo celular na rede de casa (só IPs de rede local)
  allowedDevOrigins: ["192.168.*.*", "10.*.*.*", "172.*.*.*"],
  // Cabeçalhos recomendados pro PWA (guia de PWA do Next)
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
      {
        // O service worker nunca pode ficar preso em cache, senão uma versão velha não sai mais
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Content-Security-Policy", value: "default-src 'self'; script-src 'self'" },
        ],
      },
    ];
  },
};

export default nextConfig;
