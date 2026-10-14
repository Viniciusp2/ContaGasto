// Notificação no celular (Web Push, 1.7.3). As chaves VAPID nascem sozinhas no banco na primeira vez,
// como o segredo da sessão: não precisa configurar nada na Vercel (VAPID_PUBLIC_KEY e VAPID_PRIVATE_KEY, se
// existirem, mandam).
import { and, eq, isNull } from "drizzle-orm";
import webpush from "web-push";
import { lerPreferencias, type Inscricao, type PreferenciasAvisos } from "@/lib/avisos";
import { db } from ".";
import { aparelhosPush, configAvisos } from "./schema";
import { USUARIO_PADRAO } from "./usuario-padrao";

const userId = USUARIO_PADRAO.id;

async function linhaDaConfig() {
  let [linha] = await db.select().from(configAvisos).where(eq(configAvisos.userId, userId));
  if (!linha) {
    await db.insert(configAvisos).values({ userId }).onConflictDoNothing();
    [linha] = await db.select().from(configAvisos).where(eq(configAvisos.userId, userId));
  }
  return linha;
}

export async function preferenciasAvisos(): Promise<PreferenciasAvisos> {
  return lerPreferencias((await linhaDaConfig()).tipos);
}

export async function gravarPreferencias(p: PreferenciasAvisos) {
  await linhaDaConfig();
  await db.update(configAvisos).set({ tipos: p }).where(eq(configAvisos.userId, userId));
}

export async function chavesVapid(): Promise<{ publica: string; privada: string }> {
  const env = { publica: process.env.VAPID_PUBLIC_KEY ?? "", privada: process.env.VAPID_PRIVATE_KEY ?? "" };
  if (env.publica && env.privada) return env;
  let linha = await linhaDaConfig();
  if (!linha.vapidPublica || !linha.vapidPrivada) {
    const novas = webpush.generateVAPIDKeys();
    // Só grava se ninguém gravou antes (duas abas ao mesmo tempo ficam com a mesma chave)
    await db
      .update(configAvisos)
      .set({ vapidPublica: novas.publicKey, vapidPrivada: novas.privateKey })
      .where(and(eq(configAvisos.userId, userId), isNull(configAvisos.vapidPublica)));
    linha = await linhaDaConfig();
  }
  return { publica: linha.vapidPublica!, privada: linha.vapidPrivada! };
}

// Contato que vai junto pro serviço de push (Apple, Google): o endereço do site, nunca o seu e-mail
function assunto() {
  if (process.env.VAPID_ASSUNTO) return process.env.VAPID_ASSUNTO;
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  return "mailto:bolso@example.com";
}

export function listarAparelhos() {
  return db.select().from(aparelhosPush).where(eq(aparelhosPush.userId, userId)).orderBy(aparelhosPush.createdAt);
}

export async function gravarAparelho(i: Inscricao, nome: string) {
  await db
    .insert(aparelhosPush)
    .values({ userId, ...i, nome, falhas: 0 })
    .onConflictDoUpdate({ target: aparelhosPush.endpoint, set: { userId, p256dh: i.p256dh, auth: i.auth, nome, falhas: 0 } });
}

export async function apagarAparelho(filtro: { id?: string; endpoint?: string }) {
  const onde = filtro.id ? eq(aparelhosPush.id, filtro.id) : eq(aparelhosPush.endpoint, filtro.endpoint ?? "");
  await db.delete(aparelhosPush).where(and(eq(aparelhosPush.userId, userId), onde));
}

export type Mensagem = { titulo: string; corpo: string; url: string; tag: string };

// Manda pra todos os aparelhos. Inscrição que o navegador cancelou (404/410) sai da lista.
export async function enviarParaAparelhos(m: Mensagem) {
  const aparelhos = await listarAparelhos();
  if (aparelhos.length === 0) return { enviados: 0, falharam: 0 };
  const { publica, privada } = await chavesVapid();
  const opcoes = { TTL: 12 * 60 * 60, vapidDetails: { subject: assunto(), publicKey: publica, privateKey: privada } };
  let enviados = 0;
  let falharam = 0;
  for (const a of aparelhos) {
    try {
      await webpush.sendNotification({ endpoint: a.endpoint, keys: { p256dh: a.p256dh, auth: a.auth } }, JSON.stringify(m), opcoes);
      await db.update(aparelhosPush).set({ ultimoEnvio: new Date(), falhas: 0 }).where(eq(aparelhosPush.id, a.id));
      enviados++;
    } catch (erro) {
      falharam++;
      const status = erro instanceof webpush.WebPushError ? erro.statusCode : undefined;
      console.error(`[push] ${a.nome}: falhou (${status ?? "sem resposta"})`);
      if (status === 404 || status === 410 || a.falhas >= 9) await db.delete(aparelhosPush).where(eq(aparelhosPush.id, a.id));
      else await db.update(aparelhosPush).set({ falhas: a.falhas + 1 }).where(eq(aparelhosPush.id, a.id));
    }
  }
  return { enviados, falharam };
}
