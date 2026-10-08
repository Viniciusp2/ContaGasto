"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { bloqueioAtual, conferirSegundoFator, gravarNovaSenha, obterAcesso, registrarErro, zerarErros } from "@/db/acesso";
import { abrirSessao } from "@/lib/cookie-sessao";
import { COOKIE_SESSAO, validarNovaSenha } from "@/lib/sessao";

export type EstadoEntrar = { erro?: string };
export type EstadoSenha = { erro?: string; ok?: string };

// Só aceita voltar pra um caminho do próprio app (nada de mandar pra outro site)
function destinoSeguro(volta: string) {
  return volta.startsWith("/") && !volta.startsWith("//") && !volta.startsWith("/\\") ? volta : "/";
}

// Freia quem tenta adivinhar a senha
const esperar = () => new Promise((r) => setTimeout(r, 1000));


const horaDe = (d: Date) =>
  new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" }).format(d);

// Com dois fatores ligado (1.8.0), entra só com a senha E o código do app (ou um código de recuperação).
// A mensagem de erro não diz qual dos dois errou. Depois de 5 erros seguidos, trava por 15 minutos.
export async function entrar(_: EstadoEntrar, formData: FormData): Promise<EstadoEntrar> {
  const bloqueio = await bloqueioAtual();
  if (bloqueio) return { erro: `Muitas tentativas erradas. Tente de novo depois das ${horaDe(bloqueio)}.` };

  const acesso = await obterAcesso(false);
  const senhaOk = acesso.confere(String(formData.get("senha") ?? ""));
  const fatorOk = !acesso.totpAtivo || (senhaOk && (await conferirSegundoFator(String(formData.get("codigo") ?? ""))) !== null);
  if (!senhaOk || !fatorOk) {
    await esperar();
    const travou = await registrarErro();
    if (travou) return { erro: `Muitas tentativas erradas. Tente de novo depois das ${horaDe(travou)}.` };
    return { erro: acesso.totpAtivo ? "Senha ou código errado." : "Senha errada." };
  }
  await zerarErros();
  await abrirSessao(acesso.segredo);
  redirect(destinoSeguro(String(formData.get("volta") ?? "/")));
}

export async function sair() {
  (await cookies()).delete(COOKIE_SESSAO);
}

// Troca a senha. As sessões dos outros aparelhos caem; este continua dentro.
export async function trocarSenha(_: EstadoSenha, formData: FormData): Promise<EstadoSenha> {
  const bloqueio = await bloqueioAtual();
  if (bloqueio) return { erro: `Muitas tentativas erradas. Tente de novo depois das ${horaDe(bloqueio)}.` };
  const acesso = await obterAcesso(false);
  const senhaOk = acesso.confere(String(formData.get("atual") ?? ""));
  // Com dois fatores ligado, trocar a senha também pede o código (senão quem soubesse a senha trocaria)
  const fatorOk = !acesso.totpAtivo || (senhaOk && (await conferirSegundoFator(String(formData.get("codigo") ?? ""))) !== null);
  if (!senhaOk || !fatorOk) {
    await esperar();
    await registrarErro();
    return { erro: acesso.totpAtivo ? "A senha atual ou o código está errado." : "A senha atual está errada." };
  }
  await zerarErros();
  const nova = String(formData.get("nova") ?? "");
  const erro = validarNovaSenha(nova, String(formData.get("confirmacao") ?? ""));
  if (erro) return { erro };

  const segredo = await gravarNovaSenha(nova);
  await abrirSessao(segredo);
  return { ok: "Senha trocada. Os outros aparelhos vão pedir a senha nova." };
}
