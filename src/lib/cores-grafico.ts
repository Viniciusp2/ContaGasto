// Cores das marcas dos gráficos, vindas do tema (globals.css), validadas no claro e no escuro.
// Fica fora do arquivo "use client": página do servidor que importa valor de lá recebe uma referência, não a cor
// (era por isso que as barras de "Maiores vilões" e "Por forma de pagamento" apareciam vazias).
export const COR_GRAFICO = {
  gasto: "var(--grafico-gasto)",
  positivo: "var(--grafico-positivo)",
  neutro: "var(--grafico-neutro)",
} as const;
