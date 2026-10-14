"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { restaurarDemo } from "@/db";
import { MODO_DEMO } from "@/lib/demo";

// Volta todos os dados pro exemplo (só existe na demonstração)
export async function restaurarExemplo() {
  if (!MODO_DEMO) return;
  restaurarDemo();
  revalidatePath("/", "layout");
  redirect("/?salvo=exemplo");
}
