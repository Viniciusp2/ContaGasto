"use server";

import QRCode from "qrcode";
import { revalidatePath } from "next/cache";
import {
  bloqueioAtual,
  confirmarAtivacao,
  conferirSegundoFator,
  desativarDoisFatores,
  estadoDoisFatores,
  iniciarAtivacao,
  obterAcesso,
  registrarErro,
  trocarCodigosRecuperacao,
  zerarErros,
} from "@/db/acesso";
import { USUARIO_PADRAO } from "@/db/usuario-padrao";
import { abrirSessao } from "@/lib/cookie-sessao";
import { chaveLegivel, linkOtpauth } from "@/lib/totp";

export type EstadoSeguranca = { erro?: string; ok?: string; codigos?: string[]; qr?: string; chave?: string };

const esperar = () => new Promise((r) => setTimeout(r, 1000));

// Passo 1: gera o segredo (ainda pendente) e o QR code pro app autenticador ler
export async function comecarAtivacao(): Promise<EstadoSeguranca> {
  const estado = await estadoDoisFatores();
  if (estado.ativo) return { erro: "O autenticador já está ligado." };
  const segredo = await iniciarAtivacao();
  const link = linkOtpauth(segredo, USUARIO_PADRAO.nome);
  const svg = await QRCode.toString(link, { type: "svg", margin: 1, errorCorrectionLevel: "M", color: { dark: "#000000", light: "#ffffff" } });
  return { qr: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`, chave: chaveLegivel(segredo) };
}

// Passo 2: o primeiro código do app confirma. Liga o 2FA, mostra os códigos de recuperação uma vez
// e mantém este aparelho dentro (os outros saem e entram de novo, já com o código).
export async function confirmarAtivacaoAcao(_: EstadoSeguranca, fd: FormData): Promise<EstadoSeguranca> {
  const r = await confirmarAtivacao(String(fd.get("codigo") ?? ""));
  if (!r.ok) {
    await esperar();
    return { erro: r.erro };
  }
  await abrirSessao(r.segredoSessao);
  revalidatePath("/", "layout");
  return { ok: "Autenticador ligado.", codigos: r.codigos };
}

// Códigos de recuperação novos (os antigos deixam de valer). Pede o código do app.
export async function gerarNovosCodigos(_: EstadoSeguranca, fd: FormData): Promise<EstadoSeguranca> {
  if (await bloqueioAtual()) return { erro: "Muitas tentativas erradas. Espere 15 minutos." };
  if ((await conferirSegundoFator(String(fd.get("codigo") ?? ""))) !== "app") {
    await esperar();
    await registrarErro();
    return { erro: "Código do app errado." };
  }
  await zerarErros();
  return { ok: "Códigos novos gerados. Os antigos não valem mais.", codigos: await trocarCodigosRecuperacao() };
}

// Desligar pede senha e código (quem pegar o celular desbloqueado sozinho não desliga)
export async function desligarDoisFatores(_: EstadoSeguranca, fd: FormData): Promise<EstadoSeguranca> {
  if (await bloqueioAtual()) return { erro: "Muitas tentativas erradas. Espere 15 minutos." };
  const acesso = await obterAcesso(false);
  const senhaOk = acesso.confere(String(fd.get("senha") ?? ""));
  if (!senhaOk || (await conferirSegundoFator(String(fd.get("codigo") ?? ""))) === null) {
    await esperar();
    await registrarErro();
    return { erro: "Senha ou código errado." };
  }
  await zerarErros();
  await abrirSessao(await desativarDoisFatores());
  revalidatePath("/", "layout");
  return { ok: "Autenticador desligado. No site ele é obrigatório: na próxima página, vai pedir pra ligar de novo." };
}
