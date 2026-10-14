import { describe, expect, it } from "vitest";
import { MINUTOS_SEM_USO_PRA_RESTAURAR, modoDemo, precisaRestaurar } from "./demo";
import { lerConfigIA } from "./ia/config";

describe("modo demonstração", () => {
  it("liga só com BOLSO_DEMO", () => {
    expect(modoDemo({})).toBe(false);
    expect(modoDemo({ BOLSO_DEMO: "1" })).toBe(true);
    expect(modoDemo({ BOLSO_DEMO: "true" })).toBe(true);
    expect(modoDemo({ BOLSO_DEMO: "0" })).toBe(false);
  });

  it("volta ao exemplo só depois do tempo sem uso", () => {
    const agora = 1_000_000_000;
    const limite = MINUTOS_SEM_USO_PRA_RESTAURAR * 60 * 1000;
    expect(precisaRestaurar(agora - limite + 1, agora)).toBe(false);
    expect(precisaRestaurar(agora - limite - 1, agora)).toBe(true);
  });

  it("a IA fica desligada mesmo com chave configurada", () => {
    const lida = lerConfigIA({ BOLSO_DEMO: "1", IA_PROVEDOR: "gemini", GEMINI_API_KEY: "x" });
    expect(lida.ok).toBe(false);
  });
});
