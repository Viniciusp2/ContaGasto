import Link from "next/link";
import { ArrowDownLeft, ArrowLeft, ArrowUpRight } from "lucide-react";
import { AcoesEmprestimo, BotaoReabrir } from "@/components/acoes-emprestimo";
import { FormEmprestimo } from "@/components/form-emprestimo";
import { listarEmprestimos } from "@/db/consultas";
import { diaCurto, hojeISO } from "@/lib/datas";
import { formatarCentavos } from "@/lib/dinheiro";
import { textoDoPrazo } from "@/lib/validar-emprestimo";

export const dynamic = "force-dynamic";

export default async function Emprestimos() {
  const hoje = hojeISO();
  const todos = await listarEmprestimos();
  const abertos = todos.filter((e) => !e.quitado);
  const quitados = todos.filter((e) => e.quitado);

  const grupos = [
    {
      titulo: "Te devem",
      dica: "Dinheiro que saiu da sua conta e ainda vai voltar",
      Icone: ArrowUpRight,
      cor: "bg-menta",
      itens: abertos.filter((e) => e.direcao === "a_receber"),
    },
    {
      titulo: "Você deve",
      dica: "Dinheiro que está na sua conta mas não é seu",
      Icone: ArrowDownLeft,
      cor: "bg-coral",
      itens: abertos.filter((e) => e.direcao === "a_pagar"),
    },
  ];

  return (
    <section className="flex flex-col gap-4">
      <div>
        <Link href="/mais" className="mb-2 inline-flex min-h-11 items-center gap-1 text-sm text-tinta-suave">
          <ArrowLeft size={16} aria-hidden /> Mais
        </Link>
        <h1 className="text-2xl font-bold">Empréstimos</h1>
        <p className="text-sm text-tinta-suave">
          Empréstimo não é renda: não muda o saldo real, só o saldo em caixa.
        </p>
      </div>

      <FormEmprestimo hoje={hoje} />

      {grupos.map(({ titulo, dica, Icone, cor, itens }) => {
        const total = itens.reduce((s, e) => s + e.valor, 0);
        return (
          <div key={titulo} className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <span className={`rounded-full p-2 ${cor}`}>
                <Icone size={18} aria-hidden />
              </span>
              <div className="flex-1">
                <h2 className="font-bold">{titulo}</h2>
                <p className="text-xs text-tinta-suave">{dica}</p>
              </div>
              <p className="text-lg font-bold tabular-nums">{formatarCentavos(total)}</p>
            </div>
            {itens.length === 0 ? (
              <p className="rounded-card bg-cartao p-4 text-center text-sm text-tinta-suave shadow-suave">Ninguém por aqui.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {itens.map((e) => (
                  <li key={e.id} className="rounded-card bg-cartao p-4 shadow-suave">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-semibold">{e.pessoa}</p>
                        <p className="truncate text-sm text-tinta-suave">
                          {e.descricao} · desde <span className="capitalize">{diaCurto(e.data)}</span>
                        </p>
                        {e.prazo && (
                          <span
                            className={`mt-1 inline-block rounded-full px-2 text-xs font-semibold ${
                              textoDoPrazo(e.prazo, hoje).atrasado ? "bg-coral" : "bg-limao"
                            }`}
                          >
                            {textoDoPrazo(e.prazo, hoje).texto} ({diaCurto(e.prazo)})
                          </span>
                        )}
                      </div>
                      <p className="shrink-0 font-bold tabular-nums">{formatarCentavos(e.valor)}</p>
                    </div>
                    <AcoesEmprestimo id={e.id} direcao={e.direcao} valor={e.valor} hoje={hoje} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}

      {quitados.length > 0 && (
        <details className="rounded-card bg-cartao px-4 py-1 shadow-suave">
          <summary className="flex min-h-11 cursor-pointer items-center text-sm font-semibold">
            Quitados ({quitados.length})
          </summary>
          <ul className="flex flex-col gap-2 pb-3">
            {quitados.map((e) => (
              <li key={e.id} className="flex items-center justify-between gap-2 text-sm">
                <span className="min-w-0">
                  <span className="block truncate">{e.pessoa}</span>
                  <span className="block text-xs text-tinta-suave">
                    {e.perdido ? "Não voltou" : e.direcao === "a_pagar" ? "Pago" : "Recebido"} em{" "}
                    {e.dataQuitacao ? diaCurto(e.dataQuitacao) : ""}
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-1">
                  <span className="tabular-nums">{formatarCentavos(e.valor)}</span>
                  <BotaoReabrir id={e.id} />
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}
