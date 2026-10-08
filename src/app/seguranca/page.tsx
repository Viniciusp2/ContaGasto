import Link from "next/link";
import { ArrowLeft, ShieldAlert, ShieldCheck } from "lucide-react";
import { AtivarDoisFatores, DesligarDoisFatores, NovosCodigos } from "@/components/seguranca";
import { estadoDoisFatores, obterAcesso } from "@/db/acesso";

export const dynamic = "force-dynamic";

// Segurança (1.8.0): autenticação em dois fatores com app autenticador
export default async function Seguranca({ searchParams }: { searchParams: Promise<{ obrigatorio?: string }> }) {
  const [estado, acesso, params] = await Promise.all([estadoDoisFatores(), obterAcesso(false), searchParams]);
  const obrigatorio = params.obrigatorio === "1" && !estado.ativo;

  return (
    <section className="flex flex-col gap-4">
      <div>
        {!obrigatorio && (
          <Link href="/mais" className="mb-2 inline-flex min-h-11 items-center gap-1 text-sm text-tinta-suave">
            <ArrowLeft size={16} aria-hidden /> Mais
          </Link>
        )}
        <h1 className="text-2xl font-bold">Segurança</h1>
        <p className="text-sm text-tinta-suave">
          Dois fatores: além da senha, um código de 6 dígitos que muda a cada 30 segundos no app autenticador do seu celular. Mesmo que
          alguém descubra a senha, não entra sem o celular.
        </p>
      </div>

      {obrigatorio && (
        <p className="flex items-start gap-2 rounded-card bg-limao px-4 py-3 text-sm font-semibold">
          <ShieldAlert size={20} className="shrink-0" aria-hidden /> Antes de continuar, ligue o autenticador. Leva um minuto.
        </p>
      )}

      {acesso.usandoSenhaInicial && (
        <p className="rounded-card bg-coral px-4 py-3 text-sm">
          Você ainda está com a senha <strong>1234</strong>. Com o autenticador ela deixa de ser o único cadeado, mas vale trocar depois em Mais.
        </p>
      )}

      <section className="flex flex-col gap-3 rounded-card bg-cartao p-4 shadow-suave">
        {estado.ativo ? (
          <>
            <p className="flex items-center gap-2 font-semibold">
              <ShieldCheck size={20} aria-hidden /> Autenticador ligado
            </p>
            <p className="text-sm text-tinta-suave">
              Pra entrar: senha + código do app. Códigos de recuperação que ainda valem: <strong>{estado.codigosRestantes}</strong>.
              {estado.codigosRestantes <= 2 ? " Estão acabando: gere novos." : ""}
            </p>
            <h2 className="mt-2 font-semibold">Códigos de recuperação novos</h2>
            <NovosCodigos />
            <DesligarDoisFatores />
          </>
        ) : (
          <>
            <h2 className="font-semibold">Ligar o autenticador</h2>
            <AtivarDoisFatores />
          </>
        )}
      </section>
    </section>
  );
}
