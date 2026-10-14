import { exportarTudo } from "@/db/backup";
import { nomeDoArquivo } from "@/lib/backup";
import { hojeISO } from "@/lib/datas";

// Baixa o backup completo em JSON
export async function GET() {
  const backup = await exportarTudo();
  return new Response(JSON.stringify(backup, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${nomeDoArquivo(hojeISO())}"`,
      "Cache-Control": "no-store",
    },
  });
}
