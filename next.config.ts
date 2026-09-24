import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
