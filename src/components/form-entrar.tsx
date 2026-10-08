"use client";

import { useActionState, useState } from "react";
import { LockKeyhole } from "lucide-react";
import { entrar, type EstadoEntrar } from "@/app/entrar/actions";

const campo = "mt-1 min-h-12 w-full rounded-2xl bg-fundo px-4 text-lg outline-none focus:ring-2 focus:ring-lavanda";

// Com dois fatores ligado (1.8.0), pede também o código do app autenticador (ou um código de recuperação)
export function FormEntrar({ volta, pedirCodigo = false }: { volta: string; pedirCodigo?: boolean }) {
  const [estado, acao, entrando] = useActionState(entrar, {} as EstadoEntrar);
  const [recuperacao, setRecuperacao] = useState(false);
  return (
    <form action={acao} className="flex flex-col gap-3">
      <input type="hidden" name="volta" value={volta} />
      <label className="text-sm font-semibold">
        Senha
        <input name="senha" type="password" autoComplete="current-password" autoFocus required className={campo} />
      </label>
      {pedirCodigo && (
        <>
          <label className="text-sm font-semibold">
            {recuperacao ? "Código de recuperação" : "Código do app autenticador"}
            <input
              key={recuperacao ? "rec" : "app"}
              name="codigo"
              required
              autoComplete={recuperacao ? "off" : "one-time-code"}
              inputMode={recuperacao ? "text" : "numeric"}
              maxLength={recuperacao ? 12 : 6}
              placeholder={recuperacao ? "abcd-efgh" : "6 dígitos"}
              className={`${campo} tracking-widest`}
            />
          </label>
          <button type="button" onClick={() => setRecuperacao(!recuperacao)} className="min-h-11 text-sm text-tinta-suave underline">
            {recuperacao ? "Usar o código do app" : "Perdi o celular: usar um código de recuperação"}
          </button>
        </>
      )}
      {estado.erro && (
        <p role="alert" className="rounded-2xl bg-coral px-4 py-2 text-sm font-semibold">
          {estado.erro}
        </p>
      )}
      <button type="submit" disabled={entrando} className="flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-coral font-bold disabled:opacity-50">
        <LockKeyhole size={18} aria-hidden /> Entrar
      </button>
    </form>
  );
}
