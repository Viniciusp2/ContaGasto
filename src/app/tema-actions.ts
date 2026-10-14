"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { COOKIE_TEMA, lerTema } from "@/lib/tema";

export async function definirTema(valor: string) {
  const tema = lerTema(valor);
  const cookieStore = await cookies();
  if (tema === "sistema") cookieStore.delete(COOKIE_TEMA);
  else cookieStore.set(COOKIE_TEMA, tema, { maxAge: 60 * 60 * 24 * 365 * 2, sameSite: "lax", path: "/" });
  revalidatePath("/", "layout");
}
