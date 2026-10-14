import { KeyRound } from "lucide-react";

// Na demonstração a IA fica desligada. Este cartão ensina a ligar numa cópia própria, com a chave da pessoa.
export function GuiaIA() {
  const repo = process.env.BOLSO_REPO_URL;
  return (
    <section aria-labelledby="titulo-guia-ia" className="flex flex-col gap-3 rounded-card bg-cartao p-4 shadow-suave">
      <h2 id="titulo-guia-ia" className="flex items-center gap-2 font-semibold">
        <span className="rounded-full bg-menta p-1.5 sobre-pastel">
          <KeyRound size={18} aria-hidden />
        </span>
        Ligue com a sua própria chave
      </h2>
      <p className="text-sm text-tinta-suave">
        Na demonstração a IA fica desligada, pra ninguém gastar a chave de ninguém. Na sua cópia, ela lança gastos
        falando (&quot;gastei 32 no almoço&quot;), comenta o mês e responde dúvidas, sempre com os números calculados pelo app.
      </p>
      <ol className="flex list-decimal flex-col gap-1 pl-5 text-sm">
        <li>Pegue uma chave grátis no Google AI Studio (Gemini) ou no Groq.</li>
        <li>
          Na sua cópia, crie o arquivo <code>.env.local</code> com <code>IA_PROVEDOR=gemini</code> e{" "}
          <code>GEMINI_API_KEY=sua-chave</code>.
        </li>
        <li>
          Rode <code>npm run dev</code> e abra Mais, Assistente.
        </li>
      </ol>
      <p className="text-sm text-tinta-suave">
        Também funciona com Groq, OpenRouter, Anthropic ou qualquer IA no formato da OpenAI.{" "}
        {repo ? (
          <a href={`${repo.replace(/\/+$/, "")}/blob/main/docs/IA.md`} className="font-semibold underline" target="_blank" rel="noreferrer">
            Passo a passo completo
          </a>
        ) : (
          <>Passo a passo completo em <code>docs/IA.md</code>.</>
        )}
      </p>
    </section>
  );
}
