import Link from "next/link";
import { ChevronDown, Landmark } from "lucide-react";
import { SeloConta } from "@/components/selo-conta";
import { NumeroAnimado } from "@/components/animacoes";
import { diaCurto } from "@/lib/datas";
import { formatarCentavos } from "@/lib/dinheiro";

type Linha = { id: string; nome: string; sigla: string; cor: string; corTexto: string; saldo: number | null; va: boolean; saldoBaseEm: string | null };

// "Nas contas hoje": o total dos bancos; um toque abre quanto tem em cada um. O VA fica à parte (só comida).
export function NasContas({ linhas, total, faltaInformar, algumInformado }: { linhas: Linha[]; total: number; faltaInformar: number; algumInformado: boolean }) {
  if (linhas.length === 0) return null;
  if (!algumInformado) {
    return (
      <Link href="/configuracoes" className="flex min-h-14 items-center gap-3 rounded-card bg-cartao px-4 py-3 shadow-suave">
        <span className="rounded-full bg-lavanda p-2">
          <Landmark size={20} aria-hidden />
        </span>
        <span className="flex-1 text-sm">
          <span className="block font-semibold">Quanto tem em cada banco?</span>
          <span className="block text-tinta-suave">Informe o saldo de hoje de cada um (uma vez só) e o app acompanha daí pra frente.</span>
        </span>
      </Link>
    );
  }
  const bancos = linhas.filter((l) => !l.va);
  const va = linhas.filter((l) => l.va);
  return (
    <details className="group rounded-card bg-cartao shadow-suave">
      <summary className="flex min-h-16 cursor-pointer list-none items-center gap-3 p-4 [&::-webkit-details-marker]:hidden">
        <span className="rounded-full bg-menta p-2">
          <Landmark size={20} aria-hidden />
        </span>
        <span className="flex-1">
          <span className="block text-sm font-semibold">Nas contas hoje</span>
          <span className="flex items-center gap-1 text-xs text-tinta-suave">
            {bancos.map((b) => (
              <SeloConta key={b.id} nome={b.nome} sigla={b.sigla} cor={b.cor} corTexto={b.corTexto} />
            ))}
            <span className="ml-1">toque pra ver cada banco</span>
          </span>
        </span>
        <span className={`text-xl font-bold tabular-nums ${total < 0 ? "text-negativo" : ""}`}>
          <NumeroAnimado centavos={total} />
        </span>
        <ChevronDown size={18} className="shrink-0 transition-transform group-open:rotate-180" aria-hidden />
      </summary>
      <ul className="flex flex-col gap-2 border-t border-fundo px-4 pt-3 pb-4">
        {[...bancos, ...va].map((b) => (
          <li key={b.id} className="flex items-center gap-3 text-sm">
            <SeloConta nome={b.nome} sigla={b.sigla} cor={b.cor} corTexto={b.corTexto} />
            <span className="min-w-0 flex-1">
              <span className="block font-semibold">{b.nome}</span>
              <span className="block text-xs text-tinta-suave">
                {b.va ? "vale alimentação, só pra comida (fora do total)" : b.saldoBaseEm ? `acertado ${diaCurto(b.saldoBaseEm)}` : "saldo não informado"}
              </span>
            </span>
            <span className={`font-bold tabular-nums ${b.saldo !== null && b.saldo < 0 ? "text-negativo" : ""}`}>
              {b.saldo !== null ? formatarCentavos(b.saldo) : "?"}
            </span>
          </li>
        ))}
        <li className="flex justify-between pt-1 text-xs text-tinta-suave">
          <span>{faltaInformar > 0 ? `${faltaInformar} banco(s) sem saldo informado` : "Lançamentos sem banco não entram aqui."}</span>
          <Link href="/configuracoes" className="font-semibold underline">
            Acertar saldos
          </Link>
        </li>
      </ul>
    </details>
  );
}
