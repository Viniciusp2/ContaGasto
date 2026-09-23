const formatador = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

// Limite do campo inteiro do banco (int4) com folga: R$ 9.999.999,99
export const MAX_CENTAVOS = 999_999_999;

// Valores sempre em centavos (inteiro). Só vira "R$ 45,90" na hora de mostrar.
export function formatarCentavos(centavos: number) {
  return formatador.format(centavos / 100);
}

// Máscara de app de banco: cada dígito entra pela direita ("4590" vira R$ 45,90)
export function centavosDeDigitos(texto: string): number {
  const digitos = texto.replace(/\D/g, "").slice(0, 9);
  return Number(digitos || 0);
}
