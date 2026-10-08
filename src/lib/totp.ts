// Autenticação em dois fatores (1.8.0): código de 6 dígitos que muda a cada 30 segundos (TOTP, RFC 6238),
// o mesmo usado por Google Authenticator, Microsoft Authenticator, Authy etc. Só node:crypto, sem biblioteca.
import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const ALFABETO = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"; // base32 (RFC 4648), o formato que os apps leem
export const PASSO_SEGUNDOS = 30;
export const DIGITOS = 6;
export const JANELA = 1; // aceita o código anterior e o próximo (relógio do celular meio adiantado ou atrasado)

export function base32Codificar(bytes: Buffer): string {
  let bits = 0,
    valor = 0,
    saida = "";
  for (const b of bytes) {
    valor = (valor << 8) | b;
    bits += 8;
    while (bits >= 5) {
      saida += ALFABETO[(valor >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) saida += ALFABETO[(valor << (5 - bits)) & 31];
  return saida;
}

export function base32Decodificar(texto: string): Buffer {
  const limpo = texto.toUpperCase().replace(/[\s=-]/g, "");
  let bits = 0,
    valor = 0;
  const bytes: number[] = [];
  for (const c of limpo) {
    const i = ALFABETO.indexOf(c);
    if (i < 0) throw new Error("Chave inválida.");
    valor = (valor << 5) | i;
    bits += 5;
    if (bits >= 8) {
      bytes.push((valor >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

// Segredo novo: 20 bytes aleatórios (160 bits, o recomendado pro SHA-1)
export function novoSegredoTotp(): string {
  return base32Codificar(randomBytes(20));
}

export const passoDe = (agoraMs: number) => Math.floor(agoraMs / 1000 / PASSO_SEGUNDOS);

// HOTP (RFC 4226) no passo de tempo: HMAC-SHA1, truncamento dinâmico, últimos N dígitos
export function codigoNoPasso(segredo: Buffer, passo: number, digitos = DIGITOS): string {
  const contador = Buffer.alloc(8);
  contador.writeBigUInt64BE(BigInt(passo));
  const hmac = createHmac("sha1", segredo).update(contador).digest();
  const deslocamento = hmac[hmac.length - 1] & 0x0f;
  const numero = (hmac.readUInt32BE(deslocamento) & 0x7fffffff) % 10 ** digitos;
  return String(numero).padStart(digitos, "0");
}

function iguais(a: string, b: string) {
  const x = Buffer.from(a),
    y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

// Confere o código digitado. Não aceita de novo um código de um passo já usado (quem viu por cima do ombro não reusa).
export function verificarTotp(
  segredoBase32: string,
  digitado: string,
  agoraMs: number,
  ultimoPassoUsado: number | null,
): { ok: true; passo: number } | { ok: false } {
  const codigo = digitado.replace(/\s/g, "");
  if (!/^\d{6}$/.test(codigo)) return { ok: false };
  const segredo = base32Decodificar(segredoBase32);
  const agora = passoDe(agoraMs);
  for (let d = -JANELA; d <= JANELA; d++) {
    const passo = agora + d;
    if (ultimoPassoUsado !== null && passo <= ultimoPassoUsado) continue;
    if (iguais(codigoNoPasso(segredo, passo), codigo)) return { ok: true, passo };
  }
  return { ok: false };
}

// Link que o QR code carrega: os apps leem e já cadastram "Bolso (Vinícius)"
export function linkOtpauth(segredoBase32: string, conta: string, emissor = "Bolso") {
  const rotulo = encodeURIComponent(`${emissor}:${conta}`);
  const params = new URLSearchParams({ secret: segredoBase32, issuer: emissor, algorithm: "SHA1", digits: String(DIGITOS), period: String(PASSO_SEGUNDOS) });
  return `otpauth://totp/${rotulo}?${params.toString()}`;
}

// Chave pra digitar à mão, em grupos de 4: "ABCD EFGH ..."
export const chaveLegivel = (segredo: string) => segredo.match(/.{1,4}/g)!.join(" ");

// Códigos de recuperação (celular perdido): cada um vale uma vez. No banco só fica o hash.
const ALFABETO_RECUPERACAO = "abcdefghjkmnpqrstuvwxyz23456789"; // sem letras e números que confundem (0/o, 1/l/i)
export const QUANTOS_CODIGOS = 8;

export function novosCodigosRecuperacao(quantos = QUANTOS_CODIGOS): string[] {
  return Array.from({ length: quantos }, () => {
    const bytes = randomBytes(8);
    const letras = [...bytes].map((b) => ALFABETO_RECUPERACAO[b % ALFABETO_RECUPERACAO.length]).join("");
    return `${letras.slice(0, 4)}-${letras.slice(4)}`;
  });
}

export const normalizarRecuperacao = (codigo: string) => codigo.toLowerCase().replace(/[^a-z0-9]/g, "");
export const hashRecuperacao = (codigo: string) => createHash("sha256").update(normalizarRecuperacao(codigo)).digest("hex");

// Devolve a lista sem o código usado, ou null se ele não vale
export function usarCodigoRecuperacao(digitado: string, hashes: string[]): string[] | null {
  const h = hashRecuperacao(digitado);
  const i = hashes.findIndex((x) => iguais(x, h));
  return i < 0 ? null : hashes.filter((_, j) => j !== i);
}

// Trava contra força bruta: depois de 5 erros seguidos, 15 minutos sem tentar
export const MAXIMO_ERROS = 5;
export const BLOQUEIO_MS = 15 * 60 * 1000;

export function aposErro(errosAntes: number, agoraMs: number) {
  const erros = errosAntes + 1;
  return erros >= MAXIMO_ERROS ? { erros: 0, bloqueadoAte: new Date(agoraMs + BLOQUEIO_MS) } : { erros, bloqueadoAte: null };
}
