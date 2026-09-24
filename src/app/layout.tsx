import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { cookies } from "next/headers";
import { Inter } from "next/font/google";
import { AvisoSalvo, ProvedorMovimento } from "@/components/animacoes";
import { BarraInferior } from "@/components/barra-inferior";
import { BotaoLancar } from "@/components/botao-lancar";
import { COOKIE_TEMA, lerTema } from "@/lib/tema";
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
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fceffe" },
    { media: "(prefers-color-scheme: dark)", color: "#1c1620" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // "sistema" não marca nada: o CSS segue o prefers-color-scheme do celular
  const tema = lerTema((await cookies()).get(COOKIE_TEMA)?.value);

  return (
    <html
      lang="pt-BR"
      data-tema={tema === "sistema" ? undefined : tema}
      className={`${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full font-sans">
        <ProvedorMovimento>
          {/* pb extra pra barra inferior não cobrir o conteúdo */}
          <main className="mx-auto w-full max-w-md px-4 pt-6 pb-32 md:max-w-3xl lg:max-w-5xl">{children}</main>
          <Suspense>
            <AvisoSalvo />
          </Suspense>
          <BotaoLancar />
          <BarraInferior />
        </ProvedorMovimento>
      </body>
    </html>
  );
}
