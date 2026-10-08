// Grava o cookie da sessão. Fica fora dos arquivos "use server" de propósito: lá, toda função exportada
// vira uma ação que o navegador pode chamar; esta só é usada por dentro, depois de conferir senha e código (e só roda no servidor).
import { cookies } from "next/headers";
import { COOKIE_SESSAO, criarSessao } from "./sessao";

export async function abrirSessao(segredo: string) {
  const sessao = criarSessao(segredo);
  (await cookies()).set(COOKIE_SESSAO, sessao.valor, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(sessao.expiraEm),
  });
}
