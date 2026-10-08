import { timingSafeEqual } from "node:crypto";
import { rodarEnvio } from "@/db/avisos";
import { gerarRecorrencias } from "@/db/gerar-recorrencias";
import { podeRodar } from "@/lib/avisos";
import { horaNoBrasil } from "@/lib/datas";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function confere(recebido: string, esperado: string) {
  const a = Buffer.from(recebido);
  const b = Buffer.from(esperado);
  return a.length === b.length && timingSafeEqual(a, b);
}

// Chamado pelo agendador da Vercel (vercel.json): /api/avisos/manha às 8h e /api/avisos/noite às 20h.
// Com CRON_SECRET configurado, só o agendador entra. Sem ele, quem chamar não ganha nada: só sai o que ainda
// não foi mandado, no horário da vez, e a resposta não mostra nenhum dado seu (só contagens).
export async function GET(request: Request, ctx: RouteContext<"/api/avisos/[vez]">) {
  const segredo = process.env.CRON_SECRET;
  if (segredo && !confere(request.headers.get("authorization") ?? "", `Bearer ${segredo}`)) {
    return new Response("Não autorizado.", { status: 401 });
  }
  const { vez } = await ctx.params;
  if (vez !== "manha" && vez !== "noite") return new Response("Não encontrado.", { status: 404 });
  if (!podeRodar(vez, horaNoBrasil())) return Response.json({ ok: true, foraDoHorario: true });

  await gerarRecorrencias(); // o fixo de hoje vira lançamento antes de olhar as contas
  const r = await rodarEnvio(vez);
  return Response.json({ ok: true, ...r });
}
