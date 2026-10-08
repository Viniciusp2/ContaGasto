import { describe, expect, it } from "vitest";
import {
  aposErro,
  base32Codificar,
  base32Decodificar,
  BLOQUEIO_MS,
  chaveLegivel,
  codigoNoPasso,
  hashRecuperacao,
  linkOtpauth,
  novoSegredoTotp,
  novosCodigosRecuperacao,
  passoDe,
  usarCodigoRecuperacao,
  verificarTotp,
} from "./totp";

// Vetores oficiais do RFC 6238 (SHA-1, segredo "12345678901234567890", 8 dígitos)
const SEGREDO_RFC = Buffer.from("12345678901234567890");
const vetores: [number, string][] = [
  [59, "94287082"],
  [1111111109, "07081804"],
  [1111111111, "14050471"],
  [1234567890, "89005924"],
  [2000000000, "69279037"],
  [20000000000, "65353130"],
];

describe("TOTP", () => {
  it("bate com os vetores do RFC 6238", () => {
    for (const [segundos, esperado] of vetores) expect(codigoNoPasso(SEGREDO_RFC, passoDe(segundos * 1000), 8)).toBe(esperado);
  });

  it("base32 vai e volta (o formato que os apps leem)", () => {
    expect(base32Codificar(SEGREDO_RFC)).toBe("GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ");
    expect(base32Decodificar("gezd gnbv-gy3t qojq gezd gnbv gy3t qojq").equals(SEGREDO_RFC)).toBe(true);
    const s = novoSegredoTotp();
    expect(s).toMatch(/^[A-Z2-7]{32}$/);
    expect(base32Codificar(base32Decodificar(s))).toBe(s);
  });

  it("aceita o código de agora e o de 30s antes/depois; recusa o resto", () => {
    const segredo = base32Codificar(SEGREDO_RFC);
    const agora = 1234567890 * 1000;
    const codigo = (deltaPassos: number) => codigoNoPasso(SEGREDO_RFC, passoDe(agora) + deltaPassos);
    expect(verificarTotp(segredo, codigo(0), agora, null)).toEqual({ ok: true, passo: passoDe(agora) });
    expect(verificarTotp(segredo, codigo(-1), agora, null).ok).toBe(true);
    expect(verificarTotp(segredo, codigo(1), agora, null).ok).toBe(true);
    expect(verificarTotp(segredo, codigo(-2), agora, null).ok).toBe(false);
    expect(verificarTotp(segredo, "12345", agora, null).ok).toBe(false);
    expect(verificarTotp(segredo, "abcdef", agora, null).ok).toBe(false);
  });

  it("não aceita o mesmo código duas vezes", () => {
    const segredo = base32Codificar(SEGREDO_RFC);
    const agora = 1234567890 * 1000;
    const c = codigoNoPasso(SEGREDO_RFC, passoDe(agora));
    const primeira = verificarTotp(segredo, c, agora, null);
    expect(primeira.ok).toBe(true);
    expect(verificarTotp(segredo, c, agora, passoDe(agora)).ok).toBe(false);
  });

  it("link do QR e chave pra digitar", () => {
    const link = linkOtpauth("GEZDGNBVGY3TQOJQ", "Vinícius");
    expect(link.startsWith("otpauth://totp/Bolso%3AVin%C3%ADcius?")).toBe(true);
    expect(link).toContain("secret=GEZDGNBVGY3TQOJQ");
    expect(link).toContain("issuer=Bolso");
    expect(chaveLegivel("GEZDGNBVGY3TQOJQ")).toBe("GEZD GNBV GY3T QOJQ");
  });
});

describe("códigos de recuperação", () => {
  it("8 códigos legíveis, diferentes, cada um vale uma vez", () => {
    const codigos = novosCodigosRecuperacao();
    expect(codigos).toHaveLength(8);
    expect(new Set(codigos).size).toBe(8);
    for (const c of codigos) expect(c).toMatch(/^[a-z2-9]{4}-[a-z2-9]{4}$/);
    const hashes = codigos.map(hashRecuperacao);
    const depois = usarCodigoRecuperacao(codigos[2].toUpperCase().replace("-", " "), hashes);
    expect(depois).toHaveLength(7);
    expect(usarCodigoRecuperacao(codigos[2], depois!)).toBeNull();
    expect(usarCodigoRecuperacao("zzzz-zzzz", hashes)).toBeNull();
  });
});

it("trava depois de 5 erros seguidos, por 15 minutos", () => {
  expect(aposErro(0, 0)).toEqual({ erros: 1, bloqueadoAte: null });
  expect(aposErro(3, 0)).toEqual({ erros: 4, bloqueadoAte: null });
  expect(aposErro(4, 1000)).toEqual({ erros: 0, bloqueadoAte: new Date(1000 + BLOQUEIO_MS) });
});
