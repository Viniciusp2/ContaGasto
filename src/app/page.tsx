import { ArrowDownCircle, ArrowUpCircle, Wallet, Landmark } from "lucide-react";

// Por enquanto só o esqueleto visual. Os valores reais vêm do calculos.ts no Sprint 1.4.
const cards = [
  { rotulo: "Saldo real", Icone: Wallet, cor: "bg-menta" },
  { rotulo: "Saldo em caixa", Icone: Landmark, cor: "bg-lavanda" },
  { rotulo: "Recebido", Icone: ArrowDownCircle, cor: "bg-menta" },
  { rotulo: "Gasto", Icone: ArrowUpCircle, cor: "bg-coral" },
];

export default function Inicio() {
  const mes = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(
    new Date(),
  );

  return (
    <section>
      <p className="text-sm text-tinta-suave capitalize">{mes}</p>
      <h1 className="mb-6 text-2xl font-bold">Oi, Vinícius 👋</h1>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map(({ rotulo, Icone, cor }) => (
          <div key={rotulo} className="rounded-card bg-cartao p-4 shadow-suave">
            <span className={`mb-3 inline-flex rounded-full p-2 ${cor}`}>
              <Icone size={20} aria-hidden />
            </span>
            <p className="text-sm text-tinta-suave">{rotulo}</p>
            <p className="text-xl font-bold tabular-nums">R$ 0,00</p>
          </div>
        ))}
      </div>
    </section>
  );
}
