"use client";

import { useActionState } from "react";
import { LockKeyhole } from "lucide-react";
import { entrar, type EstadoEntrar } from "@/app/entrar/actions";

export function FormEntrar({ volta }: { volta: string }) {
  const [estado, acao, entrando] = useActionState(entrar, {} as EstadoEntrar);
  return (
    <form action={acao} className="flex flex-col gap-3">
      <input type="hidden" name="volta" value={volta} />
      <label className="text-sm font-semibold">
        Senha
        <input
          name="senha"
          type="password"
          autoComplete="current-password"
          autoFocus
          required
          className="mt-1 min-h-12 w-full rounded-2xl bg-fundo px-4 text-lg outline-none focus:ring-2 focus:ring-lavanda"
        />
      </label>
      {estado.erro && (
        <p role="alert" className="rounded-2xl bg-coral px-4 py-2 text-sm font-semibold">
          {estado.erro}
        </p>
      )}
      <button
        type="submit"
        disabled={entrando}
        className="flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-coral font-bold disabled:opacity-50"
      >
        <LockKeyhole size={18} aria-hidden /> Entrar
      </button>
    </form>
  );
}
