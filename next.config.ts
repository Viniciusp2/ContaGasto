import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // PGlite carrega WASM, então fica fora do bundle do servidor
  serverExternalPackages: ["@electric-sql/pglite"],
};

export default nextConfig;
