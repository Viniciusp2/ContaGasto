"use client";

import { useEffect, useRef, useState, useSyncExternalStore, useTransition } from "react";
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

// Os comentários ficam guardados no aparelho e continuam ali até você tocar em atualizar (pedido do Vinícius):
// abrir ou recarregar o Início nunca chama a IA, a não ser na primeira vez (quando não tem nada guardado).
type Guardado = { texto: string; em: string };

function lerGuardado(): Guardado | null {
  try {
    const salvo = JSON.parse(localStorage.getItem(CHAVE) ?? "null") as (Partial<Guardado> & { dia?: string }) | null;
    if (!salvo?.texto) return null;
    // Formato antigo guardava só o dia
    return { texto: salvo.texto, em: salvo.em ?? `${salvo.dia ?? ""}T12:00:00` };
  } catch {
    return null;
  }
}

function guardar(texto: string) {
  try {
    localStorage.setItem(CHAVE, JSON.stringify({ texto, em: new Date().toISOString() }));
    localStorage.removeItem(CHAVE_TENTATIVA);
  } catch {
    // sem armazenamento (aba anônima): só não guarda
  }
}

// Primeira vez que deu erro: guarda a hora, pra recarregar a página não ficar tentando de novo sozinho
const CHAVE_TENTATIVA = "bolso-comentarios-tentativa";
function jaTentou(): boolean {
  try {
    return localStorage.getItem(CHAVE_TENTATIVA) !== null;
  } catch {
    return false;
  }
}
function marcarTentativa() {
  try {
    localStorage.setItem(CHAVE_TENTATIVA, new Date().toISOString());
  } catch {}
}

// "hoje às 09:12", "ontem às 18:40" ou "07/10 às 08:05"
function quando(iso: string, hoje: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const fuso = { timeZone: "America/Sao_Paulo" } as const;
  const dia = new Intl.DateTimeFormat("en-CA", fuso).format(d);
  const hora = new Intl.DateTimeFormat("pt-BR", { ...fuso, hour: "2-digit", minute: "2-digit" }).format(d);
  const ontem = new Date(new Date(`${hoje}T12:00:00Z`).getTime() - 86_400_000).toISOString().slice(0, 10);
  if (dia === hoje) return `hoje às ${hora}`;
  if (dia === ontem) return `ontem às ${hora}`;
  return `${new Intl.DateTimeFormat("pt-BR", { ...fuso, day: "2-digit", month: "2-digit" }).format(d)} às ${hora}`;
}

const nadaMuda = () => () => {};

export function AssistenteInicio({ hoje, ligado }: { hoje: string; ligado: boolean }) {
  // O que já está guardado no aparelho (no servidor não tem: começa vazio)
  const guardado = useSyncExternalStore(nadaMuda, () => localStorage.getItem(CHAVE), () => null);
  const [novo, setNovo] = useState<Guardado | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, iniciar] = useTransition();
  const pedindo = useRef(false); // trava: uma pergunta por vez (o React pode rodar o efeito duas vezes)
  const atual = novo ?? (guardado ? lerGuardado() : null);

  function pedir() {
    if (pedindo.current) return;
    pedindo.current = true;
    iniciar(async () => {
      const r = await conversar([{ papel: "voce", texto: PEDIDO }]).finally(() => {
        pedindo.current = false;
      });
      // Erro (sem chave, limite do dia) não fica guardado: o último comentário bom continua na tela.
      // Proposta de lançamento é ignorada: aqui não tem Salvar.
      if (r.erro) {
        marcarTentativa();
        setErro(r.texto);
        return;
      }
      setErro(null);
      setNovo({ texto: r.texto, em: new Date().toISOString() });
      guardar(r.texto);
    });
  }

  // Ao abrir o Início: só pede sozinho se nunca teve comentário e nunca tentou (primeiro uso).
  // Marca a tentativa antes de pedir: nem recarregar nem o React rodando o efeito duas vezes chamam de novo.
  useEffect(() => {
    if (ligado && !lerGuardado() && !jaTentou()) {
      marcarTentativa();
      pedir();
    }
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
            aria-label="Pedir comentários novos (usa a IA)"
            title="Pedir comentários novos"
            className="flex size-11 items-center justify-center rounded-full text-tinta-suave disabled:opacity-50"
          >
            <RefreshCw size={16} className={carregando ? "animate-spin" : ""} aria-hidden />
          </button>
        )}
      </div>

      {!ligado ? (
        <p className="text-sm text-tinta-suave">O assistente ainda está desligado: falta cadastrar a chave da IA na Vercel.</p>
      ) : carregando && !atual ? (
        <p className="flex items-center gap-2 text-sm text-tinta-suave">
          <LoaderCircle size={16} className="animate-spin" aria-hidden /> Olhando o seu mês...
        </p>
      ) : (
        <>
          {erro && (
            <p role="alert" className="rounded-2xl bg-limao px-3 py-2 text-sm">
              {erro}
            </p>
          )}
          {atual ? (
            <>
              <TextoAssistente texto={atual.texto} />
              <p className="text-xs text-tinta-suave">
                {carregando ? "Pedindo comentários novos..." : `Feito ${quando(atual.em, hoje)}. Toque em atualizar pra pedir de novo.`}
              </p>
            </>
          ) : (
            !erro && <p className="text-sm text-tinta-suave">Toque em atualizar pra pedir os comentários do mês.</p>
          )}
        </>
      )}

      <Link href="/assistente" className="flex min-h-11 items-center justify-between rounded-2xl bg-fundo px-3 text-sm font-semibold">
        Perguntar ou lançar falando
        <ChevronRight size={16} aria-hidden />
      </Link>
    </section>
  );
}
