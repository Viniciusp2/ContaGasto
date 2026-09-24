// Tema: "sistema" segue o celular; "claro" e "escuro" fixam. Guardado num cookie pra página já vir certa.
export const TEMAS = ["sistema", "claro", "escuro"] as const;
export type Tema = (typeof TEMAS)[number];
export const COOKIE_TEMA = "bolso-tema";

export function lerTema(valor: string | undefined): Tema {
  return TEMAS.includes(valor as Tema) ? (valor as Tema) : "sistema";
}
