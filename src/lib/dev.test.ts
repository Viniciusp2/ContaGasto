import { describe, expect, it } from "vitest";
import { avisosDeValor, estadoVariaveis, limparDetalhe, nomesParecidos, textoDiagnostico } from "./dev";

describe("variáveis na área Dev", () => {
  it("diz só se existe, e vazio ou espaço conta como não", () => {
    const v = estadoVariaveis({ GEMINI_API_KEY: "segredo-123", OPENROUTER_API_KEY: "  ", neon_DATABASE_URL: "postgres://x" });
    expect(v.find((x) => x.nome === "GEMINI_API_KEY")).toMatchObject({ definida: true });
    expect(v.find((x) => x.nome === "OPENROUTER_API_KEY")).toMatchObject({ definida: false });
    expect(v.find((x) => x.nome === "DATABASE_URL")).toMatchObject({ definida: true, comoNome: "neon_DATABASE_URL" });
    expect(JSON.stringify(v)).not.toContain("segredo-123"); // valor nunca aparece
  });

  it("acha nome escrito diferente", () => {
    expect(nomesParecidos({ OPENROUTER_KEY: "x", openrouter_api_key: "y", GEMINI_API_KEY: "z", PATH: "/bin", OPENROUTER_VAZIA: "" })).toEqual([
      { encontrado: "OPENROUTER_KEY", talvezSeja: "OPENROUTER_API_KEY" },
      { encontrado: "openrouter_api_key", talvezSeja: "OPENROUTER_API_KEY" },
    ]);
  });
});

describe("detalhe do log", () => {
  it("tira campo com cara de segredo e corta texto grande", () => {
    const d = limparDetalhe({ ia: "groq", chave: "x", apiKey: "y", Authorization: "Bearer z", texto: "a".repeat(1500), ms: 120 });
    expect(Object.keys(d)).toEqual(["ia", "texto", "ms"]);
    expect((d.texto as string).length).toBe(1003);
  });
});

describe("texto pro Claude", () => {
  it("junta versão, variáveis, IAs e erros, sem valor de chave", () => {
    const t = textoDiagnostico({
      versao: "Versão 1.9.0",
      ambiente: "production",
      banco: "Neon (nuvem)",
      variaveis: estadoVariaveis({ GEMINI_API_KEY: "segredo" }),
      parecidos: [{ encontrado: "OPENROUTER_KEY", talvezSeja: "OPENROUTER_API_KEY" }],
      ias: [{ descricao: "OpenRouter", pronta: false, motivo: "Falta a chave da IA (OPENROUTER_API_KEY)." }],
      erros: [{ em: "08/10 12:00", origem: "assistente", mensagem: "Google Gemini falhou (código 429)" }],
    });
    expect(t).toContain("- GEMINI_API_KEY: sim");
    expect(t).toContain("- OPENROUTER_API_KEY: não");
    expect(t).toContain("ATENÇÃO: existe OPENROUTER_KEY, mas o app procura OPENROUTER_API_KEY");
    expect(t).toContain("OpenRouter: não (Falta a chave");
    expect(t).toContain("[assistente] Google Gemini falhou (código 429)");
    expect(t).not.toContain("segredo");
  });
});

describe("valor errado em IA_PROVEDOR e IA_RESERVA", () => {
  it("chave colada no lugar do nome vira aviso, sem mostrar a chave", () => {
    const chave = "sk-or-v1-0123456789abcdef0123456789abcdef";
    const avisos = avisosDeValor({ IA_RESERVA: chave, IA_PROVEDOR: "gemini" });
    expect(avisos).toHaveLength(1);
    expect(avisos[0]).toContain("IA_RESERVA parece ter uma chave dentro");
    expect(avisos.join()).not.toContain(chave);
  });
  it("nome inventado também avisa; nome certo, não", () => {
    expect(avisosDeValor({ IA_PROVEDOR: "chatgpt" })[0]).toContain("não é o nome de uma IA");
    expect(avisosDeValor({ IA_PROVEDOR: "Gemini", IA_RESERVA: "openrouter" })).toEqual([]);
  });
});
