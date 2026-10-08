// Contas de finanças que o assistente usa pra explicar (o código calcula, a IA só comenta). Tudo em centavos.

// Parcelamento com juros. Mostra as duas leituras comuns, porque loja e financeira nem sempre dizem qual usam:
// - Tabela Price: juros compostos ao mês, parcelas iguais (é como banco, cartão e financeira costumam cobrar).
// - Taxa uma vez: a porcentagem aplicada uma vez sobre o total e dividida pelas parcelas.
export function simularParcelamento(total: number, taxaMensalPct: number, parcelas: number) {
  const i = taxaMensalPct / 100;
  const price = i === 0 ? Math.ceil(total / parcelas) : Math.round((total * i) / (1 - Math.pow(1 + i, -parcelas)));
  const umaVez = Math.round((total * (1 + i)) / parcelas);
  return {
    price: { parcela: price, totalPago: price * parcelas, juros: price * parcelas - total },
    taxaUmaVez: { parcela: umaVez, totalPago: umaVez * parcelas, juros: umaVez * parcelas - total },
  };
}

// Taxa ao mês vira ao ano (juros compostos): 23% ao mês são mais de 1.000% ao ano
export function taxaAnual(taxaMensalPct: number) {
  return (Math.pow(1 + taxaMensalPct / 100, 12) - 1) * 100;
}
