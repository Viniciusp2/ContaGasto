// Selo do banco (4.11, começo): sigla + cor do banco. Não é o logo oficial (marca dos bancos), só um selo próprio.
import { normalizar } from "./busca";

type Selo = { sigla: string; cor: string; corTexto: string };

// Cor de fundo e de texto escolhidas pelo contraste (>= 4.5:1, conferido em teste)
export const BANCOS_CONHECIDOS: Record<string, Selo & { nome: string }> = {
  itau: { nome: "Itaú", sigla: "Itaú", cor: "#EC7000", corTexto: "#1A1A1A" },
  c6: { nome: "C6", sigla: "C6", cor: "#242424", corTexto: "#FFFFFF" },
  nubank: { nome: "Nubank", sigla: "Nu", cor: "#820AD1", corTexto: "#FFFFFF" },
  inter: { nome: "Inter", sigla: "Inter", cor: "#FF7A00", corTexto: "#1A1A1A" },
  bradesco: { nome: "Bradesco", sigla: "Brad", cor: "#CC092F", corTexto: "#FFFFFF" },
  santander: { nome: "Santander", sigla: "Sant", cor: "#EC0000", corTexto: "#FFFFFF" },
  caixa: { nome: "Caixa", sigla: "Caixa", cor: "#005CA9", corTexto: "#FFFFFF" },
  bb: { nome: "Banco do Brasil", sigla: "BB", cor: "#FCFC30", corTexto: "#003DA5" },
  mercadopago: { nome: "Mercado Pago", sigla: "MP", cor: "#00B1EA", corTexto: "#1A1A1A" },
  picpay: { nome: "PicPay", sigla: "PicPay", cor: "#21C25E", corTexto: "#1A1A1A" },
  alelo: { nome: "Alelo", sigla: "Alelo", cor: "#00704A", corTexto: "#FFFFFF" },
  dinheiro: { nome: "Dinheiro", sigla: "R$", cor: "#8DFFDB", corTexto: "#3A2E3F" },
};

const APELIDOS: Record<string, string> = {
  "itau unibanco": "itau",
  "c6 bank": "c6",
  nu: "nubank",
  "banco inter": "inter",
  "banco do brasil": "bb",
  "mercado pago": "mercadopago",
  carteira: "dinheiro",
};

// Banco conhecido vira o selo dele; outro qualquer ganha lavanda e as primeiras letras
export function seloDoBanco(nome: string): Selo {
  const chave = normalizar(nome).replace(/\s+/g, " ").trim();
  const conhecido = BANCOS_CONHECIDOS[APELIDOS[chave] ?? chave.replace(/\s/g, "")];
  if (conhecido) return { sigla: conhecido.sigla, cor: conhecido.cor, corTexto: conhecido.corTexto };
  return { sigla: nome.trim().slice(0, 5), cor: "#E0CFE8", corTexto: "#3A2E3F" };
}

// Contraste WCAG entre duas cores "#RRGGBB"
export function contraste(a: string, b: string): number {
  const lum = (hex: string) => {
    const [r, g, bl] = [1, 3, 5].map((i) => {
      const c = parseInt(hex.slice(i, i + 2), 16) / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
}
