"use client";

import { useActionState, useState } from "react";
import { Check, LoaderCircle } from "lucide-react";
import { salvarLancamento, type EstadoForm } from "@/app/lancamentos/actions";
import { centavosDeDigitos, formatarCentavos } from "@/lib/dinheiro";

type Categoria = { id: string; nome: string; emoji: string; cor: string; tipo: "gasto" | "entrada" };
type Forma = { id: string; nome: string };

export type LancamentoInicial = {
  id: string;
  tipo: "gasto" | "entrada";
  valor: number;
  data: string;
  descricao: string;
  categoriaId: string;
  formaPagamentoId: string | null;
  obs: string | null;
};

const inicialVazio = { erro: undefined } satisfies EstadoForm;

export function FormLancamento({
  categorias,
  formas,
  hoje,
  inicial,
}: {
  categorias: Categoria[];
  formas: Forma[];
  hoje: string;
  inicial?: LancamentoInicial;
}) {
  const [estado, acao, salvando] = useActionState(salvarLancamento, inicialVazio);
  const [tipo, setTipo] = useState<"gasto" | "entrada">(inicial?.tipo ?? "gasto");
  const [centavos, setCentavos] = useState(inicial?.valor ?? 0);
  const [categoriaId, setCategoriaId] = useState(inicial?.categoriaId ?? "");
  const [formaId, setFormaId] = useState(inicial?.formaPagamentoId ?? "");
  // Controlados: o React 19 limpa campos soltos depois da action, e um erro não pode apagar o que foi digitado
  const [data, setData] = useState(inicial?.data ?? hoje);
  const [descricao, setDescricao] = useState(inicial?.descricao ?? "");
  const [obs, setObs] = useState(inicial?.obs ?? "");

  const daCategoria = categorias.filter((c) => c.tipo === tipo);
  const podeSalvar = centavos > 0 && categoriaId !== "" && !salvando;

  function trocarTipo(novo: "gasto" | "entrada") {
    if (novo === tipo) return;
    setTipo(novo);
    setCategoriaId(""); // categoria de gasto não serve pra entrada
  }

  return (
    <form action={acao} className="flex flex-col gap-5">
      {inicial && <input type="hidden" name="id" value={inicial.id} />}
      <input type="hidden" name="tipo" value={tipo} />
      <input type="hidden" name="valor" value={centavos} />
      <input type="hidden" name="categoriaId" value={categoriaId} />
      <input type="hidden" name="formaPagamentoId" value={formaId} />

      <div role="radiogroup" aria-label="Tipo" className="grid grid-cols-2 gap-2 rounded-card bg-lavanda p-1.5">
        {(["gasto", "entrada"] as const).map((t) => (
          <button
            key={t}
            type="button"
            role="radio"
            aria-checked={tipo === t}
            onClick={() => trocarTipo(t)}
            className={`min-h-11 rounded-2xl font-semibold capitalize transition-colors ${
              tipo === t ? (t === "gasto" ? "bg-coral shadow-suave" : "bg-menta shadow-suave") : "text-tinta-suave"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div>
        <label htmlFor="valor-visivel" className="sr-only">
          Valor
        </label>
        <input
          id="valor-visivel"
          inputMode="numeric"
          autoComplete="off"
          autoFocus={!inicial}
          value={formatarCentavos(centavos)}
          onChange={(e) => setCentavos(centavosDeDigitos(e.target.value))}
          className="w-full rounded-card bg-cartao px-4 py-4 text-center text-4xl font-bold tabular-nums shadow-suave outline-none focus:ring-2 focus:ring-lavanda"
        />
      </div>

      <fieldset>
        <legend className="mb-2 text-sm font-semibold">Categoria</legend>
        <div className="grid grid-cols-3 gap-2">
          {daCategoria.map((c) => {
            const escolhida = c.id === categoriaId;
            return (
              <button
                key={c.id}
                type="button"
                aria-pressed={escolhida}
                onClick={() => setCategoriaId(c.id)}
                style={escolhida ? { backgroundColor: c.cor } : undefined}
                className={`flex min-h-16 flex-col items-center justify-center gap-0.5 rounded-2xl border-2 px-1 text-center text-xs leading-tight transition-colors ${
                  escolhida ? "border-tinta font-semibold" : "border-transparent bg-cartao"
                }`}
              >
                <span className="text-xl" aria-hidden>
                  {c.emoji}
                </span>
                {c.nome}
              </button>
            );
          })}
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-2 text-sm font-semibold">
          Forma de pagamento <span className="font-normal text-tinta-suave">(opcional)</span>
        </legend>
        <div className="flex flex-wrap gap-2">
          {formas.map((f) => {
            const escolhida = f.id === formaId;
            return (
              <button
                key={f.id}
                type="button"
                aria-pressed={escolhida}
                onClick={() => setFormaId(escolhida ? "" : f.id)}
                className={`min-h-11 rounded-full border-2 px-4 text-sm transition-colors ${
                  escolhida ? "border-tinta bg-lavanda font-semibold" : "border-transparent bg-cartao"
                }`}
              >
                {f.nome}
              </button>
            );
          })}
        </div>
      </fieldset>

      <div>
        <label htmlFor="data" className="mb-2 block text-sm font-semibold">
          Data
        </label>
        <input
          id="data"
          name="data"
          type="date"
          required
          value={data}
          onChange={(e) => setData(e.target.value)}
          className="min-h-11 w-full rounded-2xl bg-cartao px-4 outline-none focus:ring-2 focus:ring-lavanda"
        />
      </div>

      <details className="rounded-2xl bg-cartao px-4 py-1" open={Boolean(inicial)}>
        <summary className="flex min-h-11 cursor-pointer items-center text-sm font-semibold">
          Descrição e observação
        </summary>
        <div className="flex flex-col gap-3 pb-3">
          <input
            name="descricao"
            maxLength={80}
            placeholder="Descrição (se vazio, usa a categoria)"
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            className="min-h-11 rounded-2xl bg-fundo px-4 outline-none focus:ring-2 focus:ring-lavanda"
          />
          <textarea
            name="obs"
            maxLength={500}
            rows={3}
            placeholder="Observação"
            value={obs}
            onChange={(e) => setObs(e.target.value)}
            className="rounded-2xl bg-fundo px-4 py-3 outline-none focus:ring-2 focus:ring-lavanda"
          />
        </div>
      </details>

      {estado.erro && (
        <p role="alert" className="rounded-2xl bg-coral/30 px-4 py-3 text-sm font-semibold">
          {estado.erro}
        </p>
      )}

      <button
        type="submit"
        disabled={!podeSalvar}
        className="flex min-h-14 items-center justify-center gap-2 rounded-card bg-coral text-lg font-bold shadow-suave transition-transform active:scale-[0.98] disabled:opacity-50"
      >
        {salvando ? <LoaderCircle className="animate-spin" aria-hidden /> : <Check aria-hidden />}
        {inicial ? "Salvar alterações" : tipo === "gasto" ? "Salvar gasto" : "Salvar entrada"}
      </button>
    </form>
  );
}
