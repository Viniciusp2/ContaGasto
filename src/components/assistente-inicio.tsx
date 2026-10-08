"use client";

import { useEffect, useState, useSyncExternalStore, useTransition } from "react";
import Link from "next/link";
import { Bot, ChevronRight, LoaderCircle, RefreshCw } from "lucide-react";
import { conversar } from "@/app/assistente/actions";

// Pedido fixo pros comentários do Início. O assistente lê o mês sozinho (ferramenta ver_mes) antes de responder.
const PEDIDO =
  "Me dá 3 comentários curtos e úteis sobre o meu mês até agora, olhando os dados do mês: o que mais chama atenção, " +
  "um alerta se tiver algo preocupante (conta atrasada, gasto acima do normal, meta estourando) e uma dica prática pros próximos dias. " +
  "Uma frase por comentário, sem lançar nada.";

const CHAVE = "bolso-comentarios-assistente";

// Mesmo jeito de mostrar do assistente (copiado do TextoBolso da gestlink-ea): linhas "- " viram tópicos e **x** vira negrito
function TextoAssistente({ texto }: { texto: string }) {
  const negrito = (linha: string) => linha.split(/\*\*(.+?)\*\*/g).map((parte, i) => (i % 2 ? <strong key={i}>{parte}</strong> : parte));
  const linhas = texto.split("\n").filter((l) => l.trim());
  return (
    <div className="flex flex-col gap-1.5 text-sm" aria-live="polite">
      {linhas.map((linha, i) =>
        /^\s*[-*•]\s+/.test(linha) ? (
          <p key={i} className="flex gap-2">
            <span aria-hidden>•</span>
            <span>{negrito(linha.replace(/^\s*[-*•]\s+/, ""))}</span>
          </p>
        ) : (
          <p key={i}>{negrito(linha)}</p>
        ),
      )}
    </div>
  );
}

// Os comentários ficam guardados no aparelho até o dia seguinte: abrir o Início não gasta o limite da IA toda vez
function lerGuardado(hoje: string): string | null {
  try {
    const salvo = JSON.parse(localStorage.getItem(CHAVE) ?? "null") as { dia: string; texto: string } | null;
    return salvo?.dia === hoje ? salvo.texto : null;
  } catch {
    return null;
  }
}

function guardar(hoje: string, texto: string) {
  try {
    localStorage.setItem(CHAVE, JSON.stringify({ dia: hoje, texto }));
  } catch {
    // sem armazenamento (aba anônima): só não guarda
  }
}

const nadaMuda = () => () => {};

export function AssistenteInicio({ hoje, ligado }: { hoje: string; ligado: boolean }) {
  // O que já está guardado de hoje no aparelho (no servidor não tem: começa vazio)
  const guardado = useSyncExternalStore(nadaMuda, () => lerGuardado(hoje), () => null);
  const [novo, setNovo] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, iniciar] = useTransition();
  const texto = novo ?? guardado;

  function pedir() {
    iniciar(async () => {
      const r = await conversar([{ papel: "voce", texto: PEDIDO }]);
      // Erro (sem chave, limite do dia) não fica guardado: senão o cartão mostraria o aviso o dia todo.
      // Proposta de lançamento é ignorada: aqui não tem Salvar.
      if (r.erro) {
        setErro(r.texto);
        return;
      }
      setErro(null);
      setNovo(r.texto);
      guardar(hoje, r.texto);
    });
  }

  // Ao abrir o Início: se não tem nada guardado de hoje, pede uma vez
  useEffect(() => {
    if (ligado && !lerGuardado(hoje)) pedir();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- só ao montar
  }, []);

  return (
    <section aria-labelledby="titulo-assistente" className="flex flex-col gap-2 rounded-card bg-cartao p-4 shadow-suave">
      <div className="flex items-center justify-between gap-2">
        <h2 id="titulo-assistente" className="flex items-center gap-2 font-semibold">
          <span className="rounded-full bg-lavanda p-1.5">
            <Bot size={18} aria-hidden />
          </span>
          Assistente
        </h2>
        {ligado && (
          <button
            type="button"
            onClick={() => pedir()}
            disabled={carregando}
            aria-label="Pedir comentários novos"
            className="flex size-11 items-center justify-center rounded-full text-tinta-suave disabled:opacity-50"
          >
            <RefreshCw size={16} className={carregando ? "animate-spin" : ""} aria-hidden />
          </button>
        )}
      </div>

      {!ligado ? (
        <p className="text-sm text-tinta-suave">O assistente ainda está desligado: falta cadastrar a chave da IA na Vercel.</p>
      ) : carregando && !texto ? (
        <p className="flex items-center gap-2 text-sm text-tinta-suave">
          <LoaderCircle size={16} className="animate-spin" aria-hidden /> Olhando o seu mês...
        </p>
      ) : erro ? (
        <p role="alert" className="text-sm">
          {erro}
        </p>
      ) : texto ? (
        <TextoAssistente texto={texto} />
      ) : null}

      <Link href="/assistente" className="flex min-h-11 items-center justify-between rounded-2xl bg-fundo px-3 text-sm font-semibold">
        Perguntar ou lançar falando
        <ChevronRight size={16} aria-hidden />
      </Link>
    </section>
  );
}
