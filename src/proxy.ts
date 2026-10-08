// Porteiro do app (Sprint 5.1): sem sessão válida, só a tela de entrar abre.
// Em produção é sempre fechado; no computador, só depois de definir uma senha.
// Desde 1.8.0, com login ligado o autenticador (dois fatores) é obrigatório: sem ele, só a tela Segurança abre.
import { NextResponse, type NextRequest } from "next/server";
import { obterAcesso } from "@/db/acesso";
import { COOKIE_SESSAO, sessaoValida } from "@/lib/sessao";

// Abre sem login: a própria tela de entrar e o que o celular precisa pra instalar o app
const PUBLICOS = ["/entrar", "/offline", "/manifest.webmanifest", "/sw.js", "/icon.png", "/apple-icon.png"];
// Com sessão, mas antes de ligar o autenticador: só dá pra ligar ele
const SEM_AUTENTICADOR = ["/seguranca"];

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (PUBLICOS.includes(pathname) || pathname.startsWith("/icone-")) return NextResponse.next();

  let login = await obterAcesso();
  if (!login.ligado) return NextResponse.next();

  const cookie = request.cookies.get(COOKIE_SESSAO)?.value;
  // A cópia do acesso fica guardada 30s: antes de barrar, confere direto no banco (quem acabou de trocar
  // a senha ou ligar o autenticador ganhou um segredo de sessão novo)
  if (!sessaoValida(cookie, login.segredo)) login = await obterAcesso(false);
  const ehPagina = request.method === "GET" && !request.headers.get("next-action") && (request.headers.get("accept") ?? "").includes("text/html");

  if (!sessaoValida(cookie, login.segredo)) {
    // Abrir uma página manda pro login e volta depois; qualquer outra coisa (gravar, baixar) é negada
    if (ehPagina) {
      const destino = new URL("/entrar", request.url);
      if (pathname !== "/") destino.searchParams.set("volta", pathname + search);
      return NextResponse.redirect(destino);
    }
    return new NextResponse("Entre no Bolso primeiro.", { status: 401 });
  }

  if (!login.totpAtivo && !SEM_AUTENTICADOR.includes(pathname)) {
    login = await obterAcesso(false);
    if (!login.totpAtivo) {
      if (ehPagina) return NextResponse.redirect(new URL("/seguranca?obrigatorio=1", request.url));
      return new NextResponse("Ligue o autenticador em Segurança primeiro.", { status: 403 });
    }
  }
  return NextResponse.next();
}

export const config = {
  // Tudo, menos os arquivos do build (que não têm dado nenhum)
  matcher: ["/((?!_next/static|_next/image).*)"],
};
