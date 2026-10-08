import { Briefcase, Utensils } from "lucide-react";
import type { Ciclo } from "@/lib/duracao";
import { diaCurto } from "@/lib/datas";
import { formatarCentavos } from "@/lib/dinheiro";

type Resultado = { ciclos: Ciclo[]; mediaDias: number | null; acabaram: number };

function textoCiclo(c: Ciclo) {
  if (c.situacao === "acabou") return `acabou em ${c.dias} dia${c.dias === 1 ? "" : "s"} (${diaCurto(c.acabouEm!)})`;
  if (c.situacao === "sobrou") return `durou até o próximo e sobraram ${formatarCentavos(c.sobrou)}`;
  return `em andamento há ${c.dias} dia${c.dias === 1 ? "" : "s"}, faltam ${formatarCentavos(c.sobrou)} pra acabar`;
}

function Bloco({ titulo, Icone, r }: { titulo: string; Icone: typeof Briefcase; r: Resultado }) {
  if (r.ciclos.length === 0) return null;
  return (
    <div className="flex flex-col gap-2">
      <p className="flex items-center gap-2 font-semibold">
        <span className="rounded-full bg-menta p-1.5">
          <Icone size={16} aria-hidden />
        </span>
        {titulo}
      </p>
      <p className="text-2xl font-bold tabular-nums">
        {r.mediaDias !== null ? `${r.mediaDias} dia${r.mediaDias === 1 ? "" : "s"}` : "Ainda não acabou"}
        {r.mediaDias !== null && <span className="ml-2 text-sm font-normal text-tinta-suave">em média pra gastar tudo</span>}
      </p>
      <ul className="flex flex-col gap-1 text-sm">
        {[...r.ciclos].reverse().map((c) => (
          <li key={c.data} className="flex flex-wrap justify-between gap-x-2 rounded-2xl bg-fundo px-3 py-2">
            <span>
              <strong className="tabular-nums">{formatarCentavos(c.valor)}</strong> em {diaCurto(c.data)}
            </span>
            <span className="text-tinta-suave">{textoCiclo(c)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// Quanto tempo o salário e o VA levam pra acabar, a partir do dia em que caem
export function QuantoDura({ salario, va }: { salario: Resultado; va: Resultado }) {
  if (salario.ciclos.length === 0 && va.ciclos.length === 0) return null;
  return (
    <div className="flex flex-col gap-5">
      <Bloco titulo="Salário" Icone={Briefcase} r={salario} />
      <Bloco titulo="Vale alimentação" Icone={Utensils} r={va} />
      <p className="text-xs text-tinta-suave">
        Conta a partir do dia em que caiu até os gastos chegarem a 95% do valor (os trocadinhos que sobram não contam). No salário entram todos os gastos (sem o VA); no VA, só o que foi pago com ele.
      </p>
    </div>
  );
}
