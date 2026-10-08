"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { ArrowUp, BellRing, Check, LoaderCircle, Mic, MicOff, Sparkles, Trash2, X } from "lucide-react";
import { conversar, salvarDoAssistente, salvarLembreteDoAssistente } from "@/app/assistente/actions";
import { MAX_TEXTO, type MensagemChat, type Proposta, type PropostaLembrete } from "@/lib/assistente";
import { descreverRepeticao } from "@/lib/lembretes";
import { diaCurto } from "@/lib/datas";
import { formatarCentavos } from "@/lib/dinheiro";

type Mensagem = MensagemChat & { proposta?: Proposta; lembrete?: PropostaLembrete; situacao?: "salvo" | "descartado"; erro?: boolean };

const SUGESTOES = ["Analisa meu mês", "Quanto posso gastar por dia?", "O que vence essa semana?", "Onde estou gastando mais?", "Gastei 32 no iFood"];
const GUARDADO = "bolso-assistente"; // a conversa sobrevive a trocar de tela (só nesta aba)

// Ditado do navegador (grátis, roda no celular). Nem todo navegador tem: aí o botão some.
type Reconhecimento = {
  lang: string;
  interimResults: boolean;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};
function criarReconhecimento(): Reconhecimento | null {
  const w = window as unknown as Record<string, (new () => Reconhecimento) | undefined>;
  const Classe = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  return Classe ? new Classe() : null;
}

// Texto da IA: linhas com "- " viram lista e **assim** vira negrito
function TextoBolso({ texto }: { texto: string }) {
  const negrito = (linha: string) =>
    linha.split(/\*\*(.+?)\*\*/g).map((parte, i) => (i % 2 ? <strong key={i}>{parte}</strong> : parte));
  const linhas = texto.split("\n").filter((l) => l.trim());
  return (
    <div className="flex flex-col gap-1.5">
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

function CartaoProposta({ m, aoSalvar, aoDescartar }: { m: Mensagem; aoSalvar: () => Promise<string | null>; aoDescartar: () => void }) {
  const p = m.proposta!;
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const linhas: [string, string][] = [
    ["Categoria", p.categoriaNome],
    ["Dia", diaCurto(p.data)],
    ...(p.formaNome ? [["Pagou com", p.formaNome] as [string, string]] : []),
    ...(p.bancoNome ? [["Banco", p.bancoNome] as [string, string]] : []),
    ...(p.tipo === "gasto" ? [["Situação", p.pago ? "já pago" : "ainda vou pagar"] as [string, string]] : []),
  ];
  return (
    <div className="mt-2 rounded-2xl border border-lavanda bg-fundo p-3">
      <div className="flex items-baseline justify-between gap-3">
        <span className="font-semibold">{p.descricao}</span>
        <span className={`text-lg font-bold tabular-nums ${p.tipo === "entrada" ? "text-positivo" : ""}`}>
          {p.tipo === "entrada" ? "+" : "-"}
          {formatarCentavos(p.valor)}
        </span>
      </div>
      <dl className="mt-1 grid grid-cols-[auto_1fr] gap-x-3 text-sm text-tinta-suave">
        {linhas.map(([rotulo, valor]) => (
          <div key={rotulo} className="contents">
            <dt>{rotulo}</dt>
            <dd className="text-tinta">{valor}</dd>
          </div>
        ))}
      </dl>
      {m.situacao === "salvo" ? (
        <p className="mt-3 flex items-center gap-2 font-semibold text-positivo">
          <Check size={18} aria-hidden /> Salvo.{" "}
          <Link href="/lancamentos" className="font-normal text-tinta underline">
            Ver lançamentos
          </Link>
        </p>
      ) : m.situacao === "descartado" ? (
        <p className="mt-3 text-sm text-tinta-suave">Descartado.</p>
      ) : (
        <>
          {erro && <p className="mt-2 text-sm text-negativo">{erro}</p>}
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              disabled={salvando}
              onClick={async () => {
                setSalvando(true);
                setErro(await aoSalvar());
                setSalvando(false);
              }}
              className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full bg-menta font-semibold active:scale-95 disabled:opacity-60"
            >
              {salvando ? <LoaderCircle size={18} className="animate-spin" aria-hidden /> : <Check size={18} aria-hidden />}
              Salvar
            </button>
            <button
              type="button"
              onClick={aoDescartar}
              className="flex min-h-11 items-center justify-center gap-2 rounded-full bg-cartao px-4 shadow-suave active:scale-95"
            >
              <X size={18} aria-hidden /> Descartar
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// Lembrete proposto (1.7.3): confere e salva, igual ao lançamento
function CartaoLembrete({ m, aoSalvar, aoDescartar }: { m: Mensagem; aoSalvar: () => Promise<string | null>; aoDescartar: () => void }) {
  const l = m.lembrete!;
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  return (
    <div className="mt-2 rounded-2xl border border-lavanda bg-fundo p-3">
      <p className="flex items-center gap-2 font-semibold">
        <BellRing size={18} aria-hidden /> {l.titulo}
      </p>
      <p className="mt-1 text-sm text-tinta-suave">
        {diaCurto(l.data)}
        {l.repetir !== "nao" && `, ${descreverRepeticao(l.repetir, l.data)}`}. O aviso chega de manhã.
      </p>
      {m.situacao === "salvo" ? (
        <p className="mt-3 flex items-center gap-2 font-semibold text-positivo">
          <Check size={18} aria-hidden /> Salvo.{" "}
          <Link href="/avisos#lembretes" className="font-normal text-tinta underline">
            Ver lembretes
          </Link>
        </p>
      ) : m.situacao === "descartado" ? (
        <p className="mt-3 text-sm text-tinta-suave">Descartado.</p>
      ) : (
        <>
          {erro && <p className="mt-2 text-sm text-negativo">{erro}</p>}
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              disabled={salvando}
              onClick={async () => {
                setSalvando(true);
                setErro(await aoSalvar());
                setSalvando(false);
              }}
              className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full bg-menta font-semibold active:scale-95 disabled:opacity-60"
            >
              {salvando ? <LoaderCircle size={18} className="animate-spin" aria-hidden /> : <Check size={18} aria-hidden />}
              Salvar
            </button>
            <button
              type="button"
              onClick={aoDescartar}
              className="flex min-h-11 items-center justify-center gap-2 rounded-full bg-cartao px-4 shadow-suave active:scale-95"
            >
              <X size={18} aria-hidden /> Descartar
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function lerGuardado(): Mensagem[] {
  try {
    return JSON.parse(sessionStorage.getItem(GUARDADO) ?? "[]");
  } catch {
    return [];
  }
}

const nada = () => () => {};

// A conversa guardada só existe no navegador: espera a página abrir nele antes de mostrar
export function AssistenteConversa() {
  const noNavegador = useSyncExternalStore(nada, () => true, () => false);
  return noNavegador ? <Conversa /> : null;
}

function Conversa() {
  const [mensagens, setMensagens] = useState<Mensagem[]>(lerGuardado);
  const [texto, setTexto] = useState("");
  const [pensando, setPensando] = useState(false);
  const [ouvindo, setOuvindo] = useState(false);
  const [temMicrofone] = useState(() => criarReconhecimento() !== null);
  const reconhecimento = useRef<Reconhecimento | null>(null);
  const fim = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      sessionStorage.setItem(GUARDADO, JSON.stringify(mensagens));
    } catch {}
    fim.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [mensagens, pensando]);

  async function enviar(pergunta: string) {
    const limpo = pergunta.trim().slice(0, MAX_TEXTO);
    if (!limpo || pensando) return;
    const lista: Mensagem[] = [...mensagens, { papel: "voce", texto: limpo }];
    setMensagens(lista);
    setTexto("");
    setPensando(true);
    try {
      // Só o texto vai pro servidor: proposta e erro são coisa da tela
      const resposta = await conversar(lista.filter((m) => !m.erro).map(({ papel, texto }) => ({ papel, texto })));
      setMensagens((atual) => [...atual, { papel: "bolso", texto: resposta.texto, proposta: resposta.proposta, lembrete: resposta.lembrete, erro: resposta.erro }]);
    } catch {
      setMensagens((atual) => [...atual, { papel: "bolso", texto: "Sem conexão. Tenta de novo quando a internet voltar.", erro: true }]);
    }
    setPensando(false);
  }

  function marcar(i: number, situacao: Mensagem["situacao"]) {
    setMensagens((atual) => atual.map((m, j) => (j === i ? { ...m, situacao } : m)));
  }

  function ditar() {
    if (ouvindo) return reconhecimento.current?.stop();
    const r = criarReconhecimento();
    if (!r) return;
    r.lang = "pt-BR";
    r.interimResults = true;
    r.onresult = (e) => setTexto(Array.from(e.results, (res) => res[0].transcript).join(" "));
    r.onend = () => setOuvindo(false);
    reconhecimento.current = r;
    setOuvindo(true);
    r.start();
  }

  return (
    <div className="flex flex-col gap-3">
      {mensagens.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-card bg-cartao p-6 text-center shadow-suave">
          <span className="rounded-full bg-lavanda p-4">
            <Sparkles size={28} aria-hidden />
          </span>
          <p className="font-semibold">Oi! Sou o assistente do Bolso.</p>
          <p className="text-sm text-tinta-suave">
            Me conta um gasto (&ldquo;gastei 32 no iFood&rdquo;) que eu lanço pra você, ou pergunta qualquer coisa sobre o seu mês.
          </p>
        </div>
      ) : (
        <ol className="flex flex-col gap-3" aria-live="polite">
          {mensagens.map((m, i) => (
            <li key={i} className={m.papel === "voce" ? "self-end max-w-[85%]" : "self-start w-full max-w-[92%]"}>
              <div
                className={
                  m.papel === "voce"
                    ? "rounded-card rounded-br-md bg-lavanda px-4 py-2.5"
                    : `rounded-card rounded-bl-md px-4 py-3 shadow-suave ${m.erro ? "bg-limao" : "bg-cartao"}`
                }
              >
                {m.papel === "voce" ? <p className="whitespace-pre-wrap">{m.texto}</p> : <TextoBolso texto={m.texto} />}
                {m.proposta && (
                  <CartaoProposta
                    m={m}
                    aoDescartar={() => marcar(i, "descartado")}
                    aoSalvar={async () => {
                      const r = await salvarDoAssistente(m.proposta!);
                      if (!r.ok) return r.erro;
                      marcar(i, "salvo");
                      return null;
                    }}
                  />
                )}
                {m.lembrete && (
                  <CartaoLembrete
                    m={m}
                    aoDescartar={() => marcar(i, "descartado")}
                    aoSalvar={async () => {
                      const r = await salvarLembreteDoAssistente(m.lembrete!);
                      if (!r.ok) return r.erro;
                      marcar(i, "salvo");
                      return null;
                    }}
                  />
                )}
              </div>
            </li>
          ))}
          {pensando && (
            <li className="self-start rounded-card rounded-bl-md bg-cartao px-4 py-3 shadow-suave">
              <span className="flex items-center gap-2 text-tinta-suave">
                <LoaderCircle size={18} className="animate-spin" aria-hidden /> Pensando...
              </span>
            </li>
          )}
        </ol>
      )}

      {!pensando && (mensagens.length === 0 || mensagens.at(-1)?.papel === "bolso") && (
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1" aria-label="Sugestões">
          {SUGESTOES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => enviar(s)}
              className="min-h-11 shrink-0 whitespace-nowrap rounded-full bg-cartao px-4 text-sm font-medium shadow-suave active:scale-95"
            >
              {s}
            </button>
          ))}
        </div>
      )}
      <div ref={fim} />

      <form
        onSubmit={(e) => {
          e.preventDefault();
          enviar(texto);
        }}
        className="sticky bottom-[calc(4.25rem+env(safe-area-inset-bottom))] z-10 flex items-end gap-2 rounded-card bg-cartao p-2 shadow-suave"
      >
        <label htmlFor="mensagem" className="sr-only">
          Mensagem
        </label>
        <textarea
          id="mensagem"
          rows={1}
          value={texto}
          maxLength={MAX_TEXTO}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              enviar(texto);
            }
          }}
          placeholder={ouvindo ? "Pode falar..." : "Gastei 45 no mercado..."}
          className="max-h-32 min-h-11 flex-1 resize-none bg-transparent px-3 py-2.5 outline-none placeholder:text-tinta-suave"
        />
        {temMicrofone && (
          <button
            type="button"
            onClick={ditar}
            aria-label={ouvindo ? "Parar de ouvir" : "Falar"}
            aria-pressed={ouvindo}
            className={`flex size-11 shrink-0 items-center justify-center rounded-full active:scale-90 ${ouvindo ? "bg-coral" : "bg-fundo"}`}
          >
            {ouvindo ? <MicOff size={20} aria-hidden /> : <Mic size={20} aria-hidden />}
          </button>
        )}
        <button
          type="submit"
          disabled={!texto.trim() || pensando}
          aria-label="Enviar"
          className="flex size-11 shrink-0 items-center justify-center rounded-full bg-lavanda active:scale-90 disabled:opacity-50"
        >
          <ArrowUp size={20} aria-hidden />
        </button>
      </form>
      {mensagens.length > 0 && (
        <button
          type="button"
          onClick={() => setMensagens([])}
          className="flex min-h-11 items-center justify-center gap-2 self-center text-sm text-tinta-suave"
        >
          <Trash2 size={16} aria-hidden /> Limpar conversa
        </button>
      )}
    </div>
  );
}
