// Porteiro do app (Sprint 5.1): sem sessão válida, só a tela de entrar abre.
// Local sem BOLSO_SENHA fica aberto; em produção é sempre fechado.
import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_SESSAO, configuracaoLogin, sessaoValida } from "@/lib/sessao";

// Abre sem login: a própria tela de entrar e o que o celular precisa pra instalar o app
const PUBLICOS = ["/entrar", "/offline", "/manifest.webmanifest", "/sw.js", "/icon.png", "/apple-icon.png"];

export function proxy(request: NextRequest) {
  const login = configuracaoLogin(process.env);
  if (!login.ligado) return NextResponse.next();

  const { pathname, search } = request.nextUrl;
  if (PUBLICOS.includes(pathname) || pathname.startsWith("/icone-")) return NextResponse.next();

  if (login.configurado && sessaoValida(request.cookies.get(COOKIE_SESSAO)?.value, login.segredo)) {
    return NextResponse.next();
  }

  // Abrir uma página manda pro login e volta depois; qualquer outra coisa (gravar, baixar) é negada
  const ehPagina = request.method === "GET" && !request.headers.get("next-action") && (request.headers.get("accept") ?? "").includes("text/html");
  if (ehPagina) {
    const destino = new URL("/entrar", request.url);
    if (pathname !== "/") destino.searchParams.set("volta", pathname + search);
    return NextResponse.redirect(destino);
  }
  return new NextResponse("Entre no Bolso primeiro.", { status: 401 });
}

export const config = {
  // Tudo, menos os arquivos do build (que não têm dado nenhum)
  matcher: ["/((?!_next/static|_next/image).*)"],
};
