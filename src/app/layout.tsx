import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { BarraInferior } from "@/components/barra-inferior";
import { BotaoLancar } from "@/components/botao-lancar";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Bolso",
  description: "Seu controle de gastos, leve e rápido.",
};

export const viewport: Viewport = {
  themeColor: "#fceffe",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full font-sans">
        {/* pb extra pra barra inferior não cobrir o conteúdo */}
        <main className="mx-auto w-full max-w-md px-4 pt-6 pb-32 md:max-w-3xl lg:max-w-5xl">
          {children}
        </main>
        <BotaoLancar />
        <BarraInferior />
      </body>
    </html>
  );
}
