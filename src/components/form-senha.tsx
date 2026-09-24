"use client";

import { useActionState, useState } from "react";
import { KeyRound } from "lucide-react";
import { trocarSenha, type EstadoSenha } from "@/app/entrar/actions";

const campo = "mt-1 min-h-11 w-full rounded-2xl bg-fundo px-4 outline-none focus:ring-2 focus:ring-lavanda";

export function FormSenha({ usandoSenhaInicial }: { usandoSenhaInicial: boolean }) {
  // Campos controlados: um erro não apaga o que foi digitado; sucesso limpa
  const [atual, setAtual] = useState("");
  const [nova, setNova] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [estado, acao, salvando] = useActionState(async (anterior: EstadoSenha, fd: FormData) => {
    const r = await trocarSenha(anterior, fd);
    if (r.ok) {
      setAtual("");
      setNova("");
      setConfirmacao("");
    }
    return r;
  }, {});

  return (
    <form action={acao} className="flex flex-col gap-3 rounded-card bg-cartao p-4 shadow-suave">
      <h2 className="flex items-center gap-2 font-semibold">
        <KeyRound size={20} aria-hidden /> Trocar senha
      </h2>
      {usandoSenhaInicial && (
        <p className="rounded-2xl bg-limao px-3 py-2 text-sm">
          Você ainda está com a senha inicial <strong>1234</strong>. Troque por uma só sua.
        </p>
      )}
      <label className="text-sm font-semibold">
        Senha atual
        <input name="atual" type="password" autoComplete="current-password" required value={atual} onChange={(e) => setAtual(e.target.value)} className={campo} />
      </label>
      <label className="text-sm font-semibold">
        Senha nova
        <input name="nova" type="password" autoComplete="new-password" required minLength={4} value={nova} onChange={(e) => setNova(e.target.value)} className={campo} />
      </label>
      <label className="text-sm font-semibold">
        Repita a senha nova
        <input
          name="confirmacao"
          type="password"
          autoComplete="new-password"
          required
          value={confirmacao}
          onChange={(e) => setConfirmacao(e.target.value)}
          className={campo}
        />
      </label>
      {estado.erro && (
        <p role="alert" className="rounded-2xl bg-coral px-3 py-2 text-sm font-semibold">
          {estado.erro}
        </p>
      )}
      {estado.ok && (
        <p role="status" className="rounded-2xl bg-menta px-3 py-2 text-sm font-semibold">
          {estado.ok}
        </p>
      )}
      <button type="submit" disabled={salvando} className="min-h-12 rounded-2xl bg-coral font-semibold disabled:opacity-50">
        Trocar senha
      </button>
    </form>
  );
}
