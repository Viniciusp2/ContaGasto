const formatador = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

// Valores sempre em centavos (inteiro). Só vira "R$ 45,90" na hora de mostrar.
export function formatarCentavos(centavos: number) {
  return formatador.format(centavos / 100);
}
