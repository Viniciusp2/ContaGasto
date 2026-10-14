import type { LucideIcon } from "lucide-react";

// Placeholder das telas que ainda vão ser feitas nos próximos sprints
export function EmBreve({
  titulo,
  texto,
  Icone,
}: {
  titulo: string;
  texto: string;
  Icone: LucideIcon;
}) {
  return (
    <section>
      <h1 className="mb-4 text-2xl font-bold">{titulo}</h1>
      <div className="flex flex-col items-center gap-3 rounded-card bg-cartao p-8 text-center shadow-suave">
        <span className="rounded-full bg-lavanda p-4">
          <Icone size={28} aria-hidden />
        </span>
        <p className="text-tinta-suave">{texto}</p>
      </div>
    </section>
  );
}
