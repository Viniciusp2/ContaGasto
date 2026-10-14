// Quanto tem em cada banco hoje (pedido em 07/10/2026). Você informa o saldo de um dia; daí pra frente
// o app soma as entradas e tira os gastos daquele banco. Só o que já é de verdade (confirmado) e até hoje.

export type ContaSaldo = {
  id: string;
  nome: string;
  sigla: string;
  cor: string;
  corTexto: string;
  saldoBase: number | null;
  saldoBaseEm: string | null;
};

type Movimento = {
  contaId: string | null;
  data: string;
  tipo: "gasto" | "entrada";
  valor: number;
  status: string;
  formaTipo?: string | null;
  subtipoEntrada?: string | null;
};

const ehVA = (m: Movimento) => m.formaTipo === "beneficio" || m.subtipoEntrada === "beneficio";

export function saldosNasContas(contas: ContaSaldo[], movimentos: Movimento[], hoje: string) {
  const linhas = contas.map((c) => {
    const daConta = movimentos.filter((m) => m.contaId === c.id);
    // Banco do VA (ex.: Alelo): fica à parte, porque o VA é só pra comida (4.13)
    const va = daConta.length > 0 && daConta.filter(ehVA).length > daConta.length / 2;
    if (c.saldoBase === null || c.saldoBaseEm === null) return { ...c, saldo: null, va };
    let saldo = c.saldoBase;
    for (const m of daConta) {
      if (m.status !== "confirmado" || m.data <= c.saldoBaseEm || m.data > hoje) continue;
      saldo += m.tipo === "entrada" ? m.valor : -m.valor;
    }
    return { ...c, saldo, va };
  });
  const bancos = linhas.filter((l) => !l.va);
  const informados = bancos.filter((l) => l.saldo !== null);
  return {
    linhas: [...bancos.sort((a, b) => (b.saldo ?? -Infinity) - (a.saldo ?? -Infinity)), ...linhas.filter((l) => l.va)],
    total: informados.reduce((s, l) => s + (l.saldo ?? 0), 0),
    faltaInformar: bancos.filter((l) => l.saldo === null).length,
    algumInformado: informados.length > 0,
  };
}
