// Gera os ícones do app (PWA) em PNG. Rodar de novo só se o desenho mudar: npm run icones
import { writeFile } from "node:fs/promises";
import { ImageResponse } from "next/og";

const LAVANDA = "#E0CFE8";
const CORAL = "#FFAC81";
const MENTA = "#8DFFDB";
const TINTA = "#3A2E3F";

// Um bolso (coral) com uma moeda (menta) aparecendo. "escala" < 1 deixa margem pro recorte do Android.
function Desenho({ tamanho, escala, arredondado }: { tamanho: number; escala: number; arredondado: boolean }) {
  const lado = tamanho * escala;
  return (
    <div
      style={{
        width: tamanho,
        height: tamanho,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: LAVANDA,
        borderRadius: arredondado ? tamanho * 0.22 : 0,
      }}
    >
      <svg width={lado} height={lado} viewBox="0 0 100 100">
        <circle cx="62" cy="30" r="17" fill={MENTA} stroke={TINTA} strokeWidth="4" />
        <path d="M58 30 h8" stroke={TINTA} strokeWidth="4" strokeLinecap="round" />
        <path
          d="M18 38 h64 v24 a32 30 0 0 1 -64 0 z"
          fill={CORAL}
          stroke={TINTA}
          strokeWidth="5"
          strokeLinejoin="round"
        />
        <path d="M28 48 h44" stroke={TINTA} strokeWidth="3" strokeDasharray="5 5" strokeLinecap="round" />
      </svg>
    </div>
  );
}

async function salvar(caminho: string, tamanho: number, escala: number, arredondado: boolean) {
  const resposta = new ImageResponse(<Desenho tamanho={tamanho} escala={escala} arredondado={arredondado} />, {
    width: tamanho,
    height: tamanho,
  });
  await writeFile(caminho, Buffer.from(await resposta.arrayBuffer()));
  console.log(`ok ${caminho}`);
}

async function main() {
  await salvar("public/icone-192.png", 192, 0.8, true);
  await salvar("public/icone-512.png", 512, 0.8, true);
  // Maskable: fundo até a borda e desenho dentro da área segura (80% do centro)
  await salvar("public/icone-maskable-512.png", 512, 0.62, false);
  // Ícones que o Next já liga sozinho no <head>
  await salvar("src/app/icon.png", 64, 0.85, true);
  await salvar("src/app/apple-icon.png", 180, 0.72, false);
}

main();
