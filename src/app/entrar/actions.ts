"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { COOKIE_SESSAO, configuracaoLogin, criarSessao, senhaConfere } from "@/lib/sessao";

export type EstadoEntrar = { erro?: string };

// Só aceita voltar pra um caminho do próprio app (nada de mandar pra outro site)
function destinoSeguro(volta: string) {
  return volta.startsWith("/") && !volta.startsWith("//") && !volta.startsWith("/\\") ? volta : "/";
}

export async function entrar(_: EstadoEntrar, formData: FormData): Promise<EstadoEntrar> {
  const login = configuracaoLogin(process.env);
  if (!login.configurado) return { erro: "O login ainda não foi configurado (BOLSO_SENHA e BOLSO_SEGREDO)." };

  const senha = String(formData.get("senha") ?? "");
  if (!senhaConfere(senha, login.senha)) {
    // Freia quem tenta adivinhar a senha
    await new Promise((r) => setTimeout(r, 1000));
    return { erro: "Senha errada." };
  }

  const sessao = criarSessao(login.segredo);
  (await cookies()).set(COOKIE_SESSAO, sessao.valor, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(sessao.expiraEm),
  });
  redirect(destinoSeguro(String(formData.get("volta") ?? "/")));
}

export async function sair() {
  (await cookies()).delete(COOKIE_SESSAO);
}
