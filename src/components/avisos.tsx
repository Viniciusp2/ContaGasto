"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { Bell, BellOff, Check, LoaderCircle, Plus, Send, Smartphone, Trash2 } from "lucide-react";
import {
  apagarLembrete,
  concluirLembrete,
  criarLembrete,
  desinscreverAparelho,
  inscreverAparelho,
  mandarTeste,
  salvarTiposAviso,
  type EstadoLembrete,
} from "@/app/avisos/actions";
import { TIPOS_AVISO, type PreferenciasAvisos } from "@/lib/avisos";
import { MAX_TITULO_LEMBRETE, REPETICOES } from "@/lib/lembretes";

const campo = "min-h-11 w-full rounded-2xl bg-fundo px-4 outline-none focus:ring-2 focus:ring-lavanda";

// ---------- Lembretes ----------

export function NovoLembrete({ hoje }: { hoje: string }) {
  const [aberto, setAberto] = useState(false);
  const [estado, acao, salvando] = useActionState(async (anterior: EstadoLembrete, fd: FormData) => {
    const r = await criarLembrete(anterior, fd);
    if (r.ok) setAberto(false);
    return r;
  }, {});

  if (!aberto) {
    return (
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="flex min-h-12 items-center justify-center gap-2 rounded-card bg-coral font-semibold shadow-suave active:scale-[0.98]"
      >
        <Plus size={20} aria-hidden /> Novo lembrete
      </button>
    );
  }

  return (
    <form action={acao} className="flex flex-col gap-3 rounded-card bg-cartao p-4 shadow-suave">
      <label className="text-sm font-semibold">
        Lembrar de
        <input name="titulo" required maxLength={MAX_TITULO_LEMBRETE} placeholder="Pagar o IPVA, cobrar o João..." className={`mt-1 ${campo}`} />
      </label>
      <div className="grid grid-cols-2 gap-2">
        <label className="text-sm font-semibold">
          Dia
          <input name="data" type="date" required min={hoje} defaultValue={hoje} className={`mt-1 ${campo}`} />
        </label>
        <label className="text-sm font-semibold">
          Repetir
          <select name="repetir" defaultValue="nao" className={`mt-1 ${campo}`}>
            {REPETICOES.map((r) => (
              <option key={r.valor} value={r.valor}>
                {r.rotulo}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p className="text-xs text-tinta-suave">O aviso chega no celular de manhã, no dia.</p>
      {estado.erro && (
        <p role="alert" className="rounded-2xl bg-coral/30 px-4 py-3 text-sm font-semibold">
          {estado.erro}
        </p>
      )}
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={() => setAberto(false)} className="min-h-12 rounded-2xl bg-fundo font-semibold">
          Cancelar
        </button>
        <button type="submit" disabled={salvando} className="min-h-12 rounded-2xl bg-menta font-semibold disabled:opacity-60">
          {salvando ? "Salvando..." : "Criar"}
        </button>
      </div>
    </form>
  );
}

export function AcoesLembrete({ id, titulo }: { id: string; titulo: string }) {
  const [pendente, iniciar] = useTransition();
  const [apagando, setApagando] = useState(false);
  if (apagando) {
    return (
      <div className="flex shrink-0 gap-1">
        <button type="button" onClick={() => setApagando(false)} className="min-h-11 rounded-2xl bg-fundo px-3 text-sm font-semibold">
          Não
        </button>
        <button
          type="button"
          onClick={() => iniciar(() => apagarLembrete(id))}
          className="min-h-11 rounded-2xl bg-coral px-3 text-sm font-semibold"
        >
          Apagar
        </button>
      </div>
    );
  }
  return (
    <div className="flex shrink-0 gap-1">
      <button
        type="button"
        disabled={pendente}
        onClick={() => iniciar(() => concluirLembrete(id))}
        aria-label={`Marcar "${titulo}" como feito`}
        className="flex size-11 items-center justify-center rounded-full bg-menta active:scale-90 disabled:opacity-50"
      >
        {pendente ? <LoaderCircle size={18} className="animate-spin" aria-hidden /> : <Check size={18} aria-hidden />}
      </button>
      <button
        type="button"
        onClick={() => setApagando(true)}
        aria-label={`Apagar "${titulo}"`}
        className="flex size-11 items-center justify-center rounded-full text-tinta-suave"
      >
        <Trash2 size={18} aria-hidden />
      </button>
    </div>
  );
}

// ---------- Notificação no celular ----------

function bytesDaChave(base64url: string) {
  const base64 = (base64url + "=".repeat((4 - (base64url.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  const texto = atob(base64);
  const bytes = new Uint8Array(new ArrayBuffer(texto.length));
  for (let i = 0; i < texto.length; i++) bytes[i] = texto.charCodeAt(i);
  return bytes;
}

function mesmaChave(sub: PushSubscription, chave: Uint8Array) {
  const atual = sub.options.applicationServerKey;
  if (!atual) return false;
  const a = new Uint8Array(atual);
  return a.length === chave.length && a.every((b, i) => b === chave[i]);
}

type Situacao = "carregando" | "sem-suporte" | "instalar-iphone" | "so-no-site" | "negado" | "desligado" | "ligado";

export function NotificacoesCelular({ chavePublica, temAparelho }: { chavePublica: string; temAparelho: boolean }) {
  const [situacao, setSituacao] = useState<Situacao>("carregando");
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [ocupado, iniciar] = useTransition();

  useEffect(() => {
    const ua = navigator.userAgent;
    const iphone = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    const instalado = window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;
    let nova: Situacao;
    if (iphone && !instalado) nova = "instalar-iphone";
    else if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) nova = "sem-suporte";
    else if (process.env.NODE_ENV !== "production") nova = "so-no-site";
    else if (Notification.permission === "denied") nova = "negado";
    else nova = "desligado";
    // Já ligado? Pergunta ao navegador (a resposta chega depois, fora do efeito)
    const conferir =
      nova !== "desligado"
        ? Promise.resolve(nova)
        : navigator.serviceWorker.ready
            .then((reg) => reg.pushManager.getSubscription())
            .then((sub): Situacao => (sub && Notification.permission === "granted" ? "ligado" : "desligado"))
            .catch((): Situacao => "desligado");
    conferir.then(setSituacao);
  }, []);

  function ligar() {
    setMensagem(null);
    iniciar(async () => {
      // Pedir a permissão tem que ser a primeira coisa depois do toque (o iPhone exige)
      const permissao = await Notification.requestPermission();
      if (permissao !== "granted") {
        setSituacao(permissao === "denied" ? "negado" : "desligado");
        return;
      }
      try {
        const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).then(() => navigator.serviceWorker.ready);
        const chave = bytesDaChave(chavePublica);
        let sub = await reg.pushManager.getSubscription();
        // Inscrição feita com outra chave não recebe nada: refaz
        if (sub && !mesmaChave(sub, chave)) {
          await sub.unsubscribe();
          sub = null;
        }
        sub ??= await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: chave });
        const r = await inscreverAparelho(sub.toJSON());
        if (!r.ok) {
          setMensagem(r.erro ?? "Não deu pra ligar. Tenta de novo.");
          return;
        }
        setSituacao("ligado");
        const teste = await mandarTeste();
        setMensagem(teste.enviados > 0 ? "Ligado. Mandei uma notificação de teste." : "Ligado, mas o teste não chegou. Tenta mandar de novo.");
      } catch {
        setMensagem("Não deu pra ligar neste aparelho. Tenta de novo.");
      }
    });
  }

  function desligar() {
    setMensagem(null);
    iniciar(async () => {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await desinscreverAparelho({ endpoint: sub.endpoint });
        await sub.unsubscribe();
      }
      setSituacao("desligado");
    });
  }

  function testar() {
    setMensagem(null);
    iniciar(async () => {
      const r = await mandarTeste();
      setMensagem(r.enviados > 0 ? `Mandei pra ${r.enviados === 1 ? "1 aparelho" : `${r.enviados} aparelhos`}.` : "Não chegou em nenhum aparelho.");
    });
  }

  const textos: Partial<Record<Situacao, string>> = {
    "sem-suporte": "Este navegador não recebe notificação. No Android, use o Chrome; no iPhone, o app instalado.",
    "instalar-iphone":
      "No iPhone, a notificação só funciona com o Bolso na tela de início: toque em Compartilhar, depois em Adicionar à Tela de Início, e abra o Bolso por lá.",
    "so-no-site": "A notificação só liga no site publicado (no computador, em modo de desenvolvimento, ela fica desligada).",
    negado: "As notificações do Bolso estão bloqueadas neste aparelho. Libere nas configurações do navegador (ou do celular) e volte aqui.",
  };

  return (
    <div className="flex flex-col gap-3 rounded-card bg-cartao p-4 shadow-suave">
      <p className="flex items-center gap-2 font-semibold">
        <Smartphone size={18} aria-hidden /> Este aparelho
      </p>
      {situacao === "carregando" ? (
        <p className="flex items-center gap-2 text-sm text-tinta-suave">
          <LoaderCircle size={16} className="animate-spin" aria-hidden /> Conferindo...
        </p>
      ) : textos[situacao] ? (
        <p className="text-sm">{textos[situacao]}</p>
      ) : situacao === "ligado" ? (
        <>
          <p className="text-sm">Recebe os avisos de manhã (por volta das 8h) e à noite (por volta das 20h).</p>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" disabled={ocupado} onClick={testar} className="flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-lavanda font-semibold disabled:opacity-60">
              <Send size={16} aria-hidden /> Testar
            </button>
            <button type="button" disabled={ocupado} onClick={desligar} className="flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-fundo font-semibold disabled:opacity-60">
              <BellOff size={16} aria-hidden /> Desligar
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="text-sm">
            Conta vencendo, dia de receber, seus lembretes e mais, direto no celular, mesmo com o app fechado.
            {temAparelho && " (Outro aparelho já recebe.)"}
          </p>
          <button type="button" disabled={ocupado} onClick={ligar} className="flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-menta font-semibold disabled:opacity-60">
            {ocupado ? <LoaderCircle size={18} className="animate-spin" aria-hidden /> : <Bell size={18} aria-hidden />} Ligar neste aparelho
          </button>
        </>
      )}
      {mensagem && (
        <p role="status" className="text-sm font-semibold">
          {mensagem}
        </p>
      )}
      {temAparelho && situacao !== "ligado" && situacao !== "carregando" && (
        <button type="button" disabled={ocupado} onClick={testar} className="min-h-11 text-sm text-tinta-suave underline">
          Mandar um teste pros outros aparelhos
        </button>
      )}
    </div>
  );
}

export function TiposAviso({ preferencias }: { preferencias: PreferenciasAvisos }) {
  const [p, setP] = useState(preferencias);
  const [, iniciar] = useTransition();
  return (
    <ul className="flex flex-col divide-y divide-fundo rounded-card bg-cartao px-4 shadow-suave">
      {TIPOS_AVISO.map((t) => (
        <li key={t.valor}>
          <label className="flex min-h-14 cursor-pointer items-center gap-3 py-2">
            <span className="flex-1">
              <span className="block text-sm font-semibold">{t.rotulo}</span>
              <span className="block text-xs text-tinta-suave">{t.texto}</span>
            </span>
            <input
              type="checkbox"
              role="switch"
              checked={p[t.valor]}
              onChange={(e) => {
                const novo = { ...p, [t.valor]: e.target.checked };
                setP(novo);
                iniciar(() => salvarTiposAviso(novo));
              }}
              className="peer sr-only"
            />
            <span
              aria-hidden
              className="relative h-7 w-12 shrink-0 rounded-full bg-fundo transition-colors peer-checked:bg-menta peer-focus-visible:ring-2 peer-focus-visible:ring-lavanda after:absolute after:top-1 after:left-1 after:size-5 after:rounded-full after:bg-tinta-suave after:transition-transform peer-checked:after:translate-x-5 peer-checked:after:bg-tinta"
            />
          </label>
        </li>
      ))}
    </ul>
  );
}
