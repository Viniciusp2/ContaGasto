// Conferir (Sprint 6.8, pedido em 07/10/2026): caça o que pode estar fazendo os números não baterem.
// Funções puras; a tela só mostra e deixa você decidir (nada é apagado sozinho).

export type LancConferir = {
  id: string;
  data: string;
  vencimento: string | null;
  valor: number;
  tipo: "gasto" | "entrada";
  status: "confirmado" | "a_pagar" | "estimado";
  descricao: string;
  obs: string | null;
  contaId: string | null;
  recorrenciaId: string | null;
};

const PAGOU_ATE_DIAS_ANTES = 7;
const PAGOU_ATE_DIAS_DEPOIS = 45;
const DIAS_REPETIDO = 1;

export function diasEntre(a: string, b: string) {
  const d = (s: string) => Date.UTC(Number(s.slice(0, 4)), Number(s.slice(5, 7)) - 1, Number(s.slice(8, 10)));
  return Math.round((d(b) - d(a)) / 86_400_000);
}

const doExtrato = (l: LancConferir) => Boolean(l.obs && /Extrato [^:]+:/.test(l.obs));

// Conta a pagar (ou estimada com o mesmo valor) e um gasto já confirmado com o mesmo valor, perto do vencimento:
// provavelmente é o pagamento dela lançado à parte. A mais antiga fica com o pagamento mais perto.
export function contasQueParecemPagas(lancs: LancConferir[]) {
  const pendentes = lancs
    .filter((l) => l.tipo === "gasto" && l.status !== "confirmado")
    .sort((a, b) => (a.vencimento ?? a.data).localeCompare(b.vencimento ?? b.data));
  const pagos = lancs.filter((l) => l.tipo === "gasto" && l.status === "confirmado");
  const usados = new Set<string>();
  const pares: { pendente: LancConferir; pagamento: LancConferir }[] = [];
  for (const p of pendentes) {
    const venc = p.vencimento ?? p.data;
    const achado = pagos
      .filter((g) => !usados.has(g.id) && g.valor === p.valor)
      .filter((g) => {
        const dias = diasEntre(venc, g.data);
        return dias >= -PAGOU_ATE_DIAS_ANTES && dias <= PAGOU_ATE_DIAS_DEPOIS;
      })
      .sort((a, b) => Math.abs(diasEntre(venc, a.data)) - Math.abs(diasEntre(venc, b.data)))[0];
    if (!achado) continue;
    usados.add(achado.id);
    pares.push({ pendente: p, pagamento: achado });
  }
  return pares;
}

// Atrasada e sem nenhum pagamento parecido: ou não foi paga, ou foi paga por fora (dinheiro, outra conta)
export function atrasadasSemPagamento(lancs: LancConferir[], hoje: string) {
  const comPar = new Set(contasQueParecemPagas(lancs).map((p) => p.pendente.id));
  return lancs
    .filter((l) => l.tipo === "gasto" && l.status === "a_pagar" && (l.vencimento ?? l.data) < hoje && !comPar.has(l.id))
    .sort((a, b) => (a.vencimento ?? a.data).localeCompare(b.vencimento ?? b.data));
}

export const chavePar = (a: string, b: string) => [a, b].sort().join("|");

// Dois lançamentos confirmados com o mesmo tipo e valor, no mesmo dia ou com 1 dia de diferença.
// Fica de fora quando os dois vieram de extrato (de qualquer banco): cada banco registrou o seu, então são de verdade.
// Repetido de verdade é quando pelo menos um dos dois foi lançado à mão (ou por um fixo).
export function possiveisRepetidos(lancs: LancConferir[], ignorados: Set<string>) {
  const confirmados = lancs.filter((l) => l.status === "confirmado").sort((a, b) => a.data.localeCompare(b.data) || a.id.localeCompare(b.id));
  const pares: { a: LancConferir; b: LancConferir; chave: string }[] = [];
  const usados = new Set<string>();
  for (let i = 0; i < confirmados.length; i++) {
    const a = confirmados[i];
    if (usados.has(a.id)) continue;
    for (let j = i + 1; j < confirmados.length; j++) {
      const b = confirmados[j];
      if (diasEntre(a.data, b.data) > DIAS_REPETIDO) break;
      if (usados.has(b.id) || a.tipo !== b.tipo || a.valor !== b.valor) continue;
      if (doExtrato(a) && doExtrato(b)) continue;
      const chave = chavePar(a.id, b.id);
      if (ignorados.has(chave)) continue;
      pares.push({ a, b, chave });
      usados.add(a.id);
      usados.add(b.id);
      break;
    }
  }
  return pares.sort((x, y) => y.a.valor - x.a.valor);
}

// Confirmado sem banco depois do primeiro saldo informado: fica fora do "Nas contas hoje" e faz o saldo não bater
export function semBanco(lancs: LancConferir[], desde: string | null, hoje: string) {
  if (!desde) return [];
  return lancs
    .filter((l) => l.status === "confirmado" && l.contaId === null && l.data > desde && l.data <= hoje)
    .sort((a, b) => b.data.localeCompare(a.data));
}

// Quanto falta pro app bater com o banco (positivo: o banco tem mais do que o app acha)
export function diferencaDoBanco(saldoApp: number, saldoBanco: number) {
  return saldoBanco - saldoApp;
}
