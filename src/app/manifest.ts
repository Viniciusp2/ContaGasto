import type { MetadataRoute } from "next";

// Instalar no celular (PWA). Ícones gerados por scripts/gerar-icones.tsx.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Bolso",
    short_name: "Bolso",
    description: "Seu controle de gastos, leve e rápido.",
    lang: "pt-BR",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#fceffe",
    theme_color: "#fceffe",
    icons: [
      { src: "/icone-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icone-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icone-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [{ name: "Lançar gasto", url: "/lancamentos/novo", icons: [{ src: "/icone-192.png", sizes: "192x192" }] }],
  };
}
