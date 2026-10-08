import { expect, it } from "vitest";
import { textoVersao } from "./versao";

it("mostra versão, commit curto e hora de Brasília", () => {
  expect(textoVersao({ versao: "1.2.1", commit: "dcaeb93e032562d5", geradoEm: "2026-10-07T23:55:00Z" })).toBe(
    "Versão 1.2.1 · dcaeb93 · 07/10/2026 20:55",
  );
});

it("sem commit nem data, só a versão", () => {
  expect(textoVersao({ versao: "dev", commit: "", geradoEm: "" })).toBe("Versão dev");
});
