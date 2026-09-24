import { WifiOff } from "lucide-react";

// Mostrada pelo service worker quando não tem internet e a página nunca foi aberta antes
export default function Offline() {
  return (
    <section className="flex flex-col items-center gap-4 rounded-card bg-cartao p-8 text-center shadow-suave">
      <span className="rounded-full bg-lavanda p-4">
        <WifiOff size={28} aria-hidden />
      </span>
      <h1 className="text-xl font-bold">Sem internet</h1>
      <p className="text-tinta-suave">
        Essa tela ainda não foi aberta com internet, então não tem cópia guardada. As telas que você já abriu
        continuam dando pra ver. Lançar precisa de conexão.
      </p>
    </section>
  );
}
