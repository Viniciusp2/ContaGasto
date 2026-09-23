"use client";

import { useActionState, useState } from "react";
import { Plus } from "lucide-react";
import { criarEmprestimo, type EstadoEmprestimo } from "@/app/emprestimos/actions";
import { centavosDeDigitos, formatarCentavos } from "@/lib/dinheiro";

const campo = "min-h-11 w-full rounded-2xl bg-fundo px-4 outline-none focus:ring-2 focus:ring-lavanda";

export function FormEmprestimo({ hoje }: { hoje: string }) {
  const [aberto, setAberto] = useState(false);
  const [direcao, setDirecao] = useState<"a_receber" | "a_pagar">("a_pagar");
  const [centavos, setCentavos] = useState(0);
  const [pessoa, setPessoa] = useState("");
  const [data, setData] = useState(hoje);
  const [descricao, setDescricao] = useState("");
  const [prazo, setPrazo] = useState("");

  const [estado, acao, salvando] = useActionState(async (anterior: EstadoEmprestimo, formData: FormData) => {
    const resultado = await criarEmprestimo(anterior, formData);
    if (resultado.ok) {
      // Salvou: limpa e fecha
      setCentavos(0);
      setPessoa("");
      setDescricao("");
      setPrazo("");
      setAberto(false);
    }
    return resultado;
  }, {});

  if (!aberto) {
    return (
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="flex min-h-14 items-center justify-center gap-2 rounded-card bg-coral font-semibold shadow-suave"
      >
        <Plus size={20} aria-hidden /> Novo empréstimo
      </button>
    );
  }

  return (
    <form action={acao} className="flex flex-col gap-3 rounded-card bg-cartao p-4 shadow-suave">
      <input type="hidden" name="direcao" value={direcao} />
      <input type="hidden" name="valor" value={centavos} />

      <div role="radiogroup" aria-label="Quem emprestou" className="grid grid-cols-2 gap-2 rounded-2xl bg-lavanda p-1.5">
        {(
          [
            ["a_pagar", "Peguei emprestado"],
            ["a_receber", "Emprestei"],
          ] as const
        ).map(([v, rotulo]) => (
          <button
            key={v}
            type="button"
            role="radio"
            aria-checked={direcao === v}
            onClick={() => setDirecao(v)}
            className={`min-h-11 rounded-xl text-sm font-semibold ${direcao === v ? "bg-cartao shadow-suave" : "text-tinta-suave"}`}
          >
            {rotulo}
          </button>
        ))}
      </div>

      <label className="text-sm font-semibold">
        {direcao === "a_pagar" ? "Quem te emprestou?" : "Pra quem você emprestou?"}
        <input
          name="pessoa"
          required
          maxLength={60}
          value={pessoa}
          onChange={(e) => setPessoa(e.target.value)}
          className={`mt-1 font-normal ${campo}`}
        />
      </label>

      <label className="text-sm font-semibold">
        Valor
        <input
          inputMode="numeric"
          value={formatarCentavos(centavos)}
          onChange={(e) => setCentavos(centavosDeDigitos(e.target.value))}
          className={`mt-1 text-center text-2xl font-bold tabular-nums ${campo}`}
        />
      </label>

      <label className="text-sm font-semibold">
        Data
        <input
          name="data"
          type="date"
          required
          value={data}
          onChange={(e) => setData(e.target.value)}
          className={`mt-1 font-normal ${campo}`}
        />
      </label>

      <label className="text-sm font-semibold">
        Prazo pra devolver <span className="font-normal text-tinta-suave">(opcional)</span>
        <input
          name="prazo"
          type="date"
          min={data}
          value={prazo}
          onChange={(e) => setPrazo(e.target.value)}
          className={`mt-1 font-normal ${campo}`}
        />
      </label>

      <label className="text-sm font-semibold">
        Descrição <span className="font-normal text-tinta-suave">(opcional)</span>
        <input
          name="descricao"
          maxLength={80}
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          className={`mt-1 font-normal ${campo}`}
        />
      </label>

      {estado.erro && (
        <p role="alert" className="rounded-2xl bg-coral/30 px-4 py-3 text-sm font-semibold">
          {estado.erro}
        </p>
      )}

      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={() => setAberto(false)} className="min-h-12 rounded-2xl bg-fundo font-semibold">
          Cancelar
        </button>
        <button
          type="submit"
          disabled={salvando || centavos <= 0 || !pessoa.trim()}
          className="min-h-12 rounded-2xl bg-coral font-semibold disabled:opacity-50"
        >
          Salvar
        </button>
      </div>
    </form>
  );
}
