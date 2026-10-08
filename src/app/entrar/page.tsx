import Image from "next/image";
import { FormEntrar } from "@/components/form-entrar";
import { obterAcesso } from "@/db/acesso";

export const dynamic = "force-dynamic";

export default async function Entrar({ searchParams }: PageProps<"/entrar">) {
  const params = await searchParams;
  const volta = typeof params.volta === "string" ? params.volta : "/";
  const { totpAtivo } = await obterAcesso(false);
  return (
    <section className="mx-auto flex max-w-sm flex-col gap-5 pt-10">
      <div className="flex flex-col items-center gap-3 text-center">
        <Image src="/icone-192.png" alt="" width={72} height={72} className="rounded-2xl" priority />
        <h1 className="text-2xl font-bold">Bolso</h1>
        <p className="text-tinta-suave">
          Seu dinheiro é só seu. {totpAtivo ? "Digite a senha e o código do app autenticador." : "Digite a senha pra entrar."}
        </p>
      </div>
      <div className="rounded-card bg-cartao p-4 shadow-suave">
        <FormEntrar volta={volta} pedirCodigo={totpAtivo} />
      </div>
    </section>
  );
}
