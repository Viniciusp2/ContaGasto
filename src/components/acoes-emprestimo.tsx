"use client";

import { useActionState, useState } from "react";
import { apagarEmprestimo, quitarEmprestimo, reabrirEmprestimo, type EstadoEmprestimo } from "@/app/emprestimos/actions";
import { centavosDeDigitos, formatarCentavos } from "@/lib/dinheiro";

type Modo = "recebi" | "paguei" | "perdido";

const textos: Record<Modo, { botao: string; confirma: string; aviso: string }> = {
  recebi: { botao: "Recebi de volta", confirma: "Confirmar", aviso: "O empréstimo sai da lista de quem te deve." },
  paguei: {
    botao: "Paguei",
    confirma: "Confirmar pagamento",
    aviso: "O valor pago vira gasto em Pagamento de empréstimo.",
  },
  perdido: {
    botao: "Não vai voltar",
    confirma: "Marcar como perdido",
    aviso: "O valor vira gasto em Outros, porque o dinheiro saiu de vez.",
  },
};

// Botões de um empréstimo em aberto: quitar (com data e, no "paguei", quanto pagou) ou apagar
export function AcoesEmprestimo({
  id,
  direcao,
  valor,
  hoje,
}: {
  id: string;
  direcao: "a_receber" | "a_pagar";
  valor: number;
  hoje: string;
}) {
  const [estado, acao, salvando] = useActionState(quitarEmprestimo, {} as EstadoEmprestimo);
  const [modo, setModo] = useState<Modo | null>(null);
  const [data, setData] = useState(hoje);
  const [pago, setPago] = useState(valor);
  const [apagando, setApagando] = useState(false);

  const modos: Modo[] = direcao === "a_pagar" ? ["paguei"] : ["recebi", "perdido"];

  if (apagando) {
    return (
      <form action={apagarEmprestimo.bind(null, id)} className="mt-3 flex items-center justify-end gap-2">
        <span className="text-sm">Apagar de vez?</span>
        <button type="button" onClick={() => setApagando(false)} className="min-h-11 px-3 text-sm">
          Cancelar
        </button>
        <button type="submit" className="min-h-11 rounded-full bg-coral px-4 text-sm font-semibold">
          Apagar
        </button>
      </form>
    );
  }

  if (!modo) {
    return (
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {modos.map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setModo(m)}
            className={`min-h-11 rounded-full px-4 text-sm font-semibold ${m === "perdido" ? "bg-fundo" : "bg-menta"}`}
          >
            {textos[m].botao}
          </button>
        ))}
        <button type="button" onClick={() => setApagando(true)} className="ml-auto min-h-11 px-3 text-sm text-tinta-suave">
          Apagar
        </button>
      </div>
    );
  }

  return (
    <form action={acao} className="mt-3 flex flex-col gap-2 rounded-2xl bg-fundo p-3">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="modo" value={modo} />
      {modo === "paguei" && <input type="hidden" name="valor" value={pago} />}
      <p className="text-sm">{textos[modo].aviso}</p>
      <div className="flex flex-wrap gap-2">
        <label className="flex-1 text-sm">
          Quando
          <input
            name="data"
            type="date"
            required
            value={data}
            onChange={(e) => setData(e.target.value)}
            className="mt-1 min-h-11 w-full rounded-2xl bg-cartao px-3 outline-none focus:ring-2 focus:ring-lavanda"
          />
        </label>
        {modo === "paguei" && (
          <label className="flex-1 text-sm">
            Quanto pagou
            <input
              inputMode="numeric"
              value={formatarCentavos(pago)}
              onChange={(e) => setPago(centavosDeDigitos(e.target.value))}
              className="mt-1 min-h-11 w-full rounded-2xl bg-cartao px-3 text-right font-semibold tabular-nums outline-none focus:ring-2 focus:ring-lavanda"
            />
          </label>
        )}
      </div>
      {estado.erro && (
        <p role="alert" className="text-sm font-semibold">
          {estado.erro}
        </p>
      )}
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={() => setModo(null)} className="min-h-11 rounded-2xl bg-cartao text-sm font-semibold">
          Cancelar
        </button>
        <button
          type="submit"
          disabled={salvando || (modo === "paguei" && pago <= 0)}
          className="min-h-11 rounded-2xl bg-coral text-sm font-semibold disabled:opacity-50"
        >
          {textos[modo].confirma}
        </button>
      </div>
    </form>
  );
}

export function BotaoReabrir({ id }: { id: string }) {
  return (
    <form action={reabrirEmprestimo.bind(null, id)}>
      <button type="submit" className="min-h-11 px-2 text-sm font-semibold text-tinta-suave underline">
        Reabrir
      </button>
    </form>
  );
}
