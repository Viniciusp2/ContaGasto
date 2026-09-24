"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { gravarNovaSenha, obterAcesso } from "@/db/acesso";
import { COOKIE_SESSAO, criarSessao, validarNovaSenha } from "@/lib/sessao";

export type EstadoEntrar = { erro?: string };
export type EstadoSenha = { erro?: string; ok?: string };

// Só aceita voltar pra um caminho do próprio app (nada de mandar pra outro site)
function destinoSeguro(volta: string) {
  return volta.startsWith("/") && !volta.startsWith("//") && !volta.startsWith("/\\") ? volta : "/";
}

// Freia quem tenta adivinhar a senha
const esperar = () => new Promise((r) => setTimeout(r, 1000));

async function abrirSessao(segredo: string) {
  const sessao = criarSessao(segredo);
  (await cookies()).set(COOKIE_SESSAO, sessao.valor, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(sessao.expiraEm),
  });
}

export async function entrar(_: EstadoEntrar, formData: FormData): Promise<EstadoEntrar> {
  const acesso = await obterAcesso(false);
  if (!acesso.confere(String(formData.get("senha") ?? ""))) {
    await esperar();
    return { erro: "Senha errada." };
  }
  await abrirSessao(acesso.segredo);
  redirect(destinoSeguro(String(formData.get("volta") ?? "/")));
}

export async function sair() {
  (await cookies()).delete(COOKIE_SESSAO);
}

// Troca a senha. As sessões dos outros aparelhos caem; este continua dentro.
export async function trocarSenha(_: EstadoSenha, formData: FormData): Promise<EstadoSenha> {
  const acesso = await obterAcesso(false);
  if (!acesso.confere(String(formData.get("atual") ?? ""))) {
    await esperar();
    return { erro: "A senha atual está errada." };
  }
  const nova = String(formData.get("nova") ?? "");
  const erro = validarNovaSenha(nova, String(formData.get("confirmacao") ?? ""));
  if (erro) return { erro };

  const segredo = await gravarNovaSenha(nova);
  await abrirSessao(segredo);
  return { ok: "Senha trocada. Os outros aparelhos vão pedir a senha nova." };
}
