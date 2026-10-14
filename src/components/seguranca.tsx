"use client";

import { useActionState, useState, useTransition } from "react";
import Link from "next/link";
import { Check, Copy, KeyRound, LoaderCircle, QrCode, ShieldCheck } from "lucide-react";
import {
  comecarAtivacao,
  confirmarAtivacaoAcao,
  desligarDoisFatores,
  gerarNovosCodigos,
  type EstadoSeguranca,
} from "@/app/seguranca/actions";

const campo = "mt-1 min-h-12 w-full rounded-2xl bg-fundo px-4 text-lg tracking-widest outline-none focus:ring-2 focus:ring-lavanda";
const botao = "flex min-h-12 items-center justify-center gap-2 rounded-2xl font-bold disabled:opacity-50";

function Erro({ texto }: { texto?: string }) {
  return texto ? (
    <p role="alert" className="rounded-2xl bg-coral px-4 py-2 text-sm font-semibold">
      {texto}
    </p>
  ) : null;
}

// Os códigos de recuperação aparecem uma vez só: dá pra copiar todos de uma vez
function CodigosRecuperacao({ codigos }: { codigos: string[] }) {
  const [copiado, setCopiado] = useState(false);
  return (
    <div className="flex flex-col gap-3 rounded-2xl bg-limao p-4">
      <p className="font-bold">Guarde estes códigos de recuperação</p>
      <p className="text-sm">
        Se perder o celular, cada um deixa entrar <strong>uma vez</strong> no lugar do código do app. Eles aparecem só agora: anote num papel ou
        guarde num lugar seguro fora do celular.
      </p>
      <ul className="grid grid-cols-2 gap-2 font-mono text-lg">
        {codigos.map((c) => (
          <li key={c} className="rounded-xl bg-cartao px-3 py-2 text-center">
            {c}
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(codigos.join("\n"));
            setCopiado(true);
          } catch {
            setCopiado(false);
          }
        }}
        className={`${botao} bg-cartao text-sm`}
      >
        {copiado ? <Check size={16} aria-hidden /> : <Copy size={16} aria-hidden />} {copiado ? "Copiados" : "Copiar os códigos"}
      </button>
    </div>
  );
}

export function AtivarDoisFatores() {
  const [preparo, setPreparo] = useState<EstadoSeguranca | null>(null);
  const [gerando, iniciar] = useTransition();
  const [estado, confirmar, confirmando] = useActionState(confirmarAtivacaoAcao, {} as EstadoSeguranca);

  if (estado.codigos) {
    return (
      <div className="flex flex-col gap-4">
        <p className="flex items-center gap-2 rounded-2xl bg-menta px-4 py-3 font-semibold">
          <ShieldCheck size={20} aria-hidden /> Pronto: o autenticador está ligado.
        </p>
        <CodigosRecuperacao codigos={estado.codigos} />
        <p className="text-sm text-tinta-suave">Os outros aparelhos saíram e vão pedir a senha e o código do app.</p>
        <Link href="/" className={`${botao} bg-coral`}>
          Já guardei, ir pro Início
        </Link>
      </div>
    );
  }

  if (!preparo?.qr) {
    return (
      <div className="flex flex-col gap-3">
        <ol className="flex list-decimal flex-col gap-1 pl-5 text-sm">
          <li>Instale um app autenticador no celular: Google Authenticator, Microsoft Authenticator ou Authy.</li>
          <li>Toque em Começar e leia o QR code com o app (ou digite a chave).</li>
          <li>Digite o código de 6 dígitos que aparecer no app pra confirmar.</li>
        </ol>
        <button
          type="button"
          disabled={gerando}
          onClick={() => iniciar(async () => setPreparo(await comecarAtivacao()))}
          className={`${botao} bg-coral`}
        >
          {gerando ? <LoaderCircle size={18} className="animate-spin" aria-hidden /> : <QrCode size={18} aria-hidden />} Começar
        </button>
        <Erro texto={preparo?.erro} />
      </div>
    );
  }

  return (
    <form action={confirmar} className="flex flex-col gap-4">
      {/* eslint-disable-next-line @next/next/no-img-element -- QR gerado na hora, em data URL */}
      <img src={preparo.qr} alt="QR code pra ler com o app autenticador" className="mx-auto size-56 rounded-2xl bg-white p-2" />
      <div className="rounded-2xl bg-fundo px-4 py-3 text-sm">
        <p className="text-tinta-suave">Não dá pra ler o QR? No app, escolha &quot;digitar chave&quot; e use:</p>
        <p className="mt-1 font-mono text-base font-bold break-all select-all">{preparo.chave}</p>
        <p className="mt-1 text-xs text-tinta-suave">Conta: Bolso · baseado em tempo</p>
      </div>
      <label className="text-sm font-semibold">
        Código de 6 dígitos que apareceu no app
        <input name="codigo" inputMode="numeric" autoComplete="one-time-code" maxLength={6} required autoFocus className={campo} />
      </label>
      <Erro texto={estado.erro} />
      <button type="submit" disabled={confirmando} className={`${botao} bg-coral`}>
        {confirmando ? <LoaderCircle size={18} className="animate-spin" aria-hidden /> : <ShieldCheck size={18} aria-hidden />} Confirmar e ligar
      </button>
    </form>
  );
}

export function NovosCodigos() {
  const [estado, gerar, gerando] = useActionState(gerarNovosCodigos, {} as EstadoSeguranca);
  if (estado.codigos) return <CodigosRecuperacao codigos={estado.codigos} />;
  return (
    <form action={gerar} className="flex flex-col gap-2">
      <label className="text-sm font-semibold">
        Código de 6 dígitos do app autenticador
        <input name="codigo" inputMode="numeric" autoComplete="one-time-code" maxLength={6} required className={campo} />
      </label>
      <Erro texto={estado.erro} />
      <button type="submit" disabled={gerando} className={`${botao} bg-lavanda text-sm`}>
        <KeyRound size={16} aria-hidden /> Gerar códigos novos
      </button>
    </form>
  );
}

export function DesligarDoisFatores() {
  const [aberto, setAberto] = useState(false);
  const [estado, desligar, desligando] = useActionState(desligarDoisFatores, {} as EstadoSeguranca);
  if (estado.ok) return <p className="rounded-2xl bg-limao px-4 py-3 text-sm font-semibold">{estado.ok}</p>;
  if (!aberto) {
    return (
      <button type="button" onClick={() => setAberto(true)} className="min-h-11 text-sm text-tinta-suave underline">
        Desligar o autenticador (trocar de celular)
      </button>
    );
  }
  return (
    <form action={desligar} className="flex flex-col gap-2 rounded-2xl bg-fundo p-3">
      <p className="text-sm">Pra trocar de celular: desligue aqui e ligue de novo lendo o QR com o celular novo.</p>
      <label className="text-sm font-semibold">
        Senha
        <input name="senha" type="password" autoComplete="current-password" required className={campo} />
      </label>
      <label className="text-sm font-semibold">
        Código do app (ou de recuperação)
        <input name="codigo" autoComplete="one-time-code" maxLength={12} required className={campo} />
      </label>
      <Erro texto={estado.erro} />
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={() => setAberto(false)} className={`${botao} bg-cartao text-sm`}>
          Cancelar
        </button>
        <button type="submit" disabled={desligando} className={`${botao} bg-coral text-sm`}>
          Desligar
        </button>
      </div>
    </form>
  );
}
