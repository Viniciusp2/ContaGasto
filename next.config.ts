import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // PGlite carrega WASM, então fica fora do bundle do servidor
  serverExternalPackages: ["@electric-sql/pglite"],
  // Libera abrir o next dev pelo celular na rede de casa (só IPs de rede local)
  allowedDevOrigins: ["192.168.*.*", "10.*.*.*", "172.*.*.*"],
};

export default nextConfig;
