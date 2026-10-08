"use client";

import { useState } from "react";
import { Check, ClipboardCopy, LoaderCircle, Play, Trash2 } from "lucide-react";
import { apagarLogs, testarIA, type ResultadoTeste } from "@/app/dev/actions";

// Botão "Testar" de cada IA: manda uma pergunta mínima e mostra o tempo ou o erro
export function TestarIA({ nome, pronta }: { nome: string; pronta: boolean }) {
  const [testando, setTestando] = useState(false);
  const [resultado, setResultado] = useState<ResultadoTeste | null>(null);
  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={!pronta || testando}
        onClick={async () => {
          setTestando(true);
          setResultado(await testarIA(nome));
          setTestando(false);
        }}
        className="flex min-h-11 items-center gap-1.5 rounded-full bg-lavanda px-4 text-sm font-semibold active:scale-95 disabled:opacity-40"
      >
        {testando ? <LoaderCircle size={16} className="animate-spin" aria-hidden /> : <Play size={16} aria-hidden />}
        Testar
      </button>
      {resultado && (
        <p className={`max-w-56 text-right text-xs ${resultado.ok ? "text-positivo" : "text-negativo"}`} role="status">
          {resultado.ok ? `ok em ${((resultado.ms ?? 0) / 1000).toFixed(1)}s: "${resultado.texto}"` : resultado.texto}
        </p>
      )}
    </div>
  );
}

// Copia o diagnóstico (sem nenhum valor de chave) pra colar na conversa com o Claude
export function CopiarDiagnostico({ texto }: { texto: string }) {
  const [copiado, setCopiado] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(texto);
          setCopiado(true);
          setTimeout(() => setCopiado(false), 2500);
        } catch {
          window.prompt("Copie o diagnóstico:", texto);
        }
      }}
      className="flex min-h-11 items-center justify-center gap-2 rounded-full bg-menta px-5 font-semibold active:scale-95"
    >
      {copiado ? <Check size={18} aria-hidden /> : <ClipboardCopy size={18} aria-hidden />}
      {copiado ? "Copiado, é só colar pro Claude" : "Copiar diagnóstico pro Claude"}
    </button>
  );
}

export function BotaoApagarLogs() {
  const [apagando, setApagando] = useState(false);
  return (
    <button
      type="button"
      disabled={apagando}
      onClick={async () => {
        if (!window.confirm("Apagar todos os logs?")) return;
        setApagando(true);
        await apagarLogs();
        setApagando(false);
      }}
      className="flex min-h-11 items-center gap-1.5 rounded-full bg-cartao px-4 text-sm shadow-suave active:scale-95 disabled:opacity-50"
    >
      <Trash2 size={16} aria-hidden /> Apagar logs
    </button>
  );
}
