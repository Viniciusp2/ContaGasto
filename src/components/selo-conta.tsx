// Selo do banco do lançamento (sigla + cor). Não é o logo oficial do banco.
export function SeloConta({ nome, sigla, cor, corTexto }: { nome: string; sigla: string; cor: string; corTexto: string }) {
  return (
    <span
      title={nome}
      aria-label={`Conta ${nome}`}
      className="inline-flex h-5 shrink-0 items-center rounded-md px-1.5 text-[11px] leading-none font-bold"
      style={{ backgroundColor: cor, color: corTexto }}
    >
      {sigla}
    </span>
  );
}
