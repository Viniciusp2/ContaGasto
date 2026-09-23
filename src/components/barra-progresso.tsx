// Barra das metas e objetivos. Cor por estado, nunca só a cor: o texto ao lado diz o mesmo.
const cores = {
  ok: "bg-menta",
  atencao: "bg-coral",
  estourou: "bg-[#d64545]",
  neutro: "bg-lavanda",
} as const;

export function BarraProgresso({
  fracao,
  estado,
  rotulo,
}: {
  fracao: number;
  estado: keyof typeof cores;
  rotulo: string;
}) {
  const largura = Math.min(Math.max(fracao, 0), 1) * 100;
  return (
    <div
      role="progressbar"
      aria-label={rotulo}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(fracao * 100)}
      className="h-3 overflow-hidden rounded-full bg-fundo"
    >
      <div className={`h-full rounded-full transition-[width] duration-500 ${cores[estado]}`} style={{ width: `${largura}%` }} />
    </div>
  );
}
