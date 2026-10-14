import { describe, expect, it } from "vitest";
import {
  avisoDeLancar,
  avisoDeResumo,
  avisoDeRitmo,
  avisosDeAssinaturas,
  avisosDeContas,
  avisosDeEmprestimos,
  avisosDeEntradas,
  avisosDeFatura,
  avisosDeLembretes,
  avisosDeMetas,
  avisosDeObjetivos,
  contarAvisos,
  lerInscricao,
  lerPreferencias,
  montarNotificacoes,
  nomeDoAparelho,
  podeRodar,
  relembrarAtraso,
  textoQuantoFalta,
  tipoDaVez,
} from "./avisos";
import { aoConcluir, conferirLembrete, descreverRepeticao, proximaVez } from "./lembretes";
import { horaNoBrasil, segundaDaSemana, somarDias } from "./datas";

const hoje = "2026-10-08"; // quinta

describe("datas", () => {
  it("soma dias atravessando mês e ano", () => {
    expect(somarDias("2026-10-31", 1)).toBe("2026-11-01");
    expect(somarDias("2026-01-01", -1)).toBe("2025-12-31");
  });
  it("segunda da semana", () => {
    expect(segundaDaSemana("2026-10-08")).toBe("2026-10-05");
    expect(segundaDaSemana("2026-10-11")).toBe("2026-10-05"); // domingo
    expect(segundaDaSemana("2026-10-05")).toBe("2026-10-05");
  });
  it("hora no fuso do Brasil", () => {
    expect(horaNoBrasil(new Date("2026-10-08T11:30:00Z"))).toBe(8);
    expect(horaNoBrasil(new Date("2026-10-08T02:00:00Z"))).toBe(23);
  });
});

describe("quanto falta e atraso", () => {
  it("texto", () => {
    expect(textoQuantoFalta(hoje, hoje)).toBe("hoje");
    expect(textoQuantoFalta("2026-10-09", hoje)).toBe("amanhã");
    expect(textoQuantoFalta("2026-10-20", hoje)).toBe("em 12 dias");
    expect(textoQuantoFalta("2026-10-07", hoje)).toBe("ontem");
    expect(textoQuantoFalta("2026-10-05", hoje)).toBe("há 3 dias");
  });
  it("atrasado lembra no 1º dia e depois a cada 3", () => {
    expect([1, 2, 3, 4, 5, 6, 7].map(relembrarAtraso)).toEqual([true, false, false, true, false, false, true]);
    expect(relembrarAtraso(0)).toBe(false);
  });
});

describe("contas", () => {
  const conta = (vencimento: string) => ({ chave: "c1", descricao: "Luz", valor: 12000, vencimento, estimado: false });
  it("nível e celular conforme o vencimento", () => {
    const [atrasada] = avisosDeContas([conta("2026-10-07")], hoje);
    expect(atrasada).toMatchObject({ nivel: "urgente", titulo: "Luz: atrasada 1 dia", push: true });
    expect(avisosDeContas([conta(hoje)], hoje)[0]).toMatchObject({ nivel: "urgente", titulo: "Luz: vence hoje", push: true });
    expect(avisosDeContas([conta("2026-10-09")], hoje)[0]).toMatchObject({ nivel: "atencao", push: true });
    expect(avisosDeContas([conta("2026-10-11")], hoje)[0]).toMatchObject({ nivel: "info", push: false });
    expect(avisosDeContas([conta("2026-10-12")], hoje)).toEqual([]);
    expect(avisosDeContas([conta("2026-10-06")], hoje)[0].push).toBe(false); // 2 dias atrasada
  });
  it("valor estimado avisa", () => {
    expect(avisosDeContas([{ ...conta(hoje), estimado: true }], hoje)[0].texto).toBe("R$ 120,00, valor estimado");
  });
  it("chave muda por dia (pra lembrar de novo amanhã)", () => {
    expect(avisosDeContas([conta(hoje)], hoje)[0].chave).toBe(`conta-c1-${hoje}`);
  });
});

describe("entradas, empréstimos, metas", () => {
  it("dia de receber só no dia", () => {
    const e = { chave: "r1-2026-10", descricao: "Salário", valor: 450000, estimado: false, va: false, salario: true };
    expect(avisosDeEntradas([{ ...e, data: hoje }], hoje)[0]).toMatchObject({ titulo: "Dia de receber: Salário", push: true });
    expect(avisosDeEntradas([{ ...e, data: "2026-10-09" }], hoje)).toEqual([]);
  });
  it("empréstimo: devolver e cobrar", () => {
    const base = { id: "e1", pessoa: "João", valor: 20000 };
    expect(avisosDeEmprestimos([{ ...base, direcao: "a_pagar", prazo: "2026-10-09" }], hoje)[0]).toMatchObject({
      titulo: "Devolver pra João amanhã",
      nivel: "atencao",
      push: true,
    });
    const cobrar = avisosDeEmprestimos([{ ...base, direcao: "a_receber", prazo: "2026-10-07" }], hoje)[0];
    expect(cobrar).toMatchObject({ titulo: "João está devendo há 1 dia", push: true });
    expect(cobrar.texto).toContain("cobrar");
    expect(avisosDeEmprestimos([{ ...base, direcao: "a_receber", prazo: "2026-10-09" }], hoje)[0].push).toBe(false);
  });
  it("meta: uma vez por estado no mês", () => {
    const m = { categoriaId: "cat", categoriaNome: "Lazer", fracao: 0.85, falta: 3000, passou: 0 };
    const [a] = avisosDeMetas([{ ...m, estado: "atencao" }], "2026-10");
    expect(a).toMatchObject({ titulo: "Lazer: 85% da meta", chave: "meta-cat-atencao-2026-10" });
    const [b] = avisosDeMetas([{ ...m, estado: "estourou", passou: 2000 }], "2026-10");
    expect(b).toMatchObject({ nivel: "urgente", texto: "Passou R$ 20,00." });
    expect(avisosDeMetas([{ ...m, estado: "ok" }], "2026-10")).toEqual([]);
  });
});

describe("ritmo, fatura, assinaturas, objetivos, resumo, lançar", () => {
  it("ritmo: avisa se acaba antes do fim e só manda depois das entradas do mês", () => {
    const r = avisoDeRitmo({ livre: 50000, porDia: 2000, acabaNoDia: 24, proximaEntrada: null }, hoje)!;
    expect(r).toMatchObject({ nivel: "atencao", push: true, chave: "ritmo-2026-10-05" });
    const comSalario = avisoDeRitmo({ livre: -1000, porDia: null, acabaNoDia: 8, proximaEntrada: { descricao: "Salário", data: "2026-10-20" } }, hoje)!;
    expect(comSalario).toMatchObject({ nivel: "urgente", push: false });
    expect(comSalario.texto).toContain("Sem contar Salário");
    expect(avisoDeRitmo({ livre: 50000, porDia: 2000, acabaNoDia: null, proximaEntrada: null }, hoje)).toBeNull();
  });
  it("melhor dia de compra é o dia depois do fechamento", () => {
    const c = { id: "nu", nome: "Nubank", diaFechamento: 7, diaVencimento: 14 };
    const [a] = avisosDeFatura([c], hoje);
    expect(a).toMatchObject({ titulo: "Melhor dia de compra no Nubank", push: true });
    expect(a.texto).toContain("14 nov");
    expect(avisosDeFatura([{ ...c, diaFechamento: 8 }], hoje)[0]).toMatchObject({ push: false, titulo: "A fatura do Nubank fecha hoje" });
    // Fechamento no dia 31: em setembro (30 dias) fecha no 30, melhor dia é 1º de outubro
    expect(avisosDeFatura([{ ...c, diaFechamento: 31 }], "2026-10-01")[0].titulo).toContain("Melhor dia");
  });
  it("assinatura renova amanhã", () => {
    expect(avisosDeAssinaturas([{ chave: "n", descricao: "Netflix", valor: 5590, renovaEm: "2026-10-09" }], hoje)).toHaveLength(1);
    expect(avisosDeAssinaturas([{ chave: "n", descricao: "Netflix", valor: 5590, renovaEm: hoje }], hoje)).toHaveLength(0);
  });
  it("objetivo só no dia de guardar e se nada foi guardado no mês", () => {
    const o = { id: "o", nome: "Celular", porMes: 30000, guardadoNoMes: 0, concluido: false };
    expect(avisosDeObjetivos([o], true, "2026-10")).toHaveLength(1);
    expect(avisosDeObjetivos([o], false, "2026-10")).toHaveLength(0);
    expect(avisosDeObjetivos([{ ...o, guardadoNoMes: 100 }], true, "2026-10")).toHaveLength(0);
  });
  it("resumo do mês nos 3 primeiros dias", () => {
    const r = { mes: { ano: 2026, mes: 9 }, entradas: 500000, gasto: 420000, saldo: 80000 };
    expect(avisoDeResumo(r, "2026-10-01")).toMatchObject({ titulo: "Setembro fechou", chave: "resumo-2026-09" });
    expect(avisoDeResumo(r, "2026-10-01")!.texto).toContain("sobrou R$ 800,00");
    expect(avisoDeResumo(r, "2026-10-04")).toBeNull();
  });
  it("lançar só se nada foi lançado e não conta no sino", () => {
    expect(avisoDeLancar(true, hoje)).toBeNull();
    const a = avisoDeLancar(false, hoje)!;
    expect(contarAvisos([{ ...a, nivel: "urgente" }])).toBe(0);
  });
  it("lembrete atrasado e de hoje", () => {
    const [a, b] = avisosDeLembretes(
      [
        { id: "l1", titulo: "Pagar IPVA", data: hoje },
        { id: "l2", titulo: "Cobrar Ana", data: "2026-10-06" },
      ],
      hoje,
    );
    expect(a).toMatchObject({ push: true, nivel: "atencao" });
    expect(b).toMatchObject({ push: false, texto: expect.stringContaining("ainda não foi marcado") });
  });
});

describe("notificações", () => {
  const preferencias = lerPreferencias({ resumo: false });
  const contas = avisosDeContas(
    [
      { chave: "a", descricao: "Luz", valor: 12000, vencimento: hoje, estimado: false },
      { chave: "b", descricao: "Água", valor: 8000, vencimento: "2026-10-09", estimado: false },
      { chave: "c", descricao: "Aluguel", valor: 125000, vencimento: "2026-10-07", estimado: false },
      { chave: "d", descricao: "Net", valor: 10000, vencimento: hoje, estimado: false },
    ],
    hoje,
  );

  it("preferência: tudo ligado menos o que foi desligado", () => {
    expect(preferencias.contas).toBe(true);
    expect(preferencias.resumo).toBe(false);
  });

  it("junta as contas numa notificação só, urgente primeiro", () => {
    const [n] = montarNotificacoes(contas, { preferencias, vez: "manha", jaEnviadas: new Set() });
    expect(n.titulo).toBe("4 contas pedindo atenção");
    expect(n.corpo.split("\n")).toHaveLength(4);
    expect(n.corpo).toContain("e mais 1");
    expect(n.corpo.split("\n")[0]).toContain("Aluguel");
    expect(n.url).toBe("/pagamentos");
    expect(n.avisos).toHaveLength(4);
  });

  it("não manda de novo o que já foi, nem o tipo desligado, nem fora da vez", () => {
    const jaEnviadas = new Set(contas.map((c) => c.chave));
    const resumo = avisoDeResumo({ mes: { ano: 2026, mes: 9 }, entradas: 1, gasto: 1, saldo: 0 }, "2026-10-01")!;
    const lancar = avisoDeLancar(false, hoje)!;
    expect(montarNotificacoes([...contas, resumo, lancar], { preferencias, vez: "manha", jaEnviadas })).toEqual([]);
    const noite = montarNotificacoes([...contas, lancar], { preferencias, vez: "noite", jaEnviadas: new Set() });
    expect(noite.map((n) => n.tag)).toEqual(["lancar"]);
  });

  it("uma só vai com o título dela", () => {
    const [n] = montarNotificacoes([contas[0]], { preferencias, vez: "manha", jaEnviadas: new Set() });
    expect(n).toMatchObject({ titulo: "Luz: vence hoje", corpo: "R$ 120,00" });
  });

  it("horário e vez", () => {
    expect(podeRodar("manha", 8)).toBe(true);
    expect(podeRodar("manha", 3)).toBe(false);
    expect(podeRodar("noite", 20)).toBe(true);
    expect(podeRodar("noite", 9)).toBe(false);
    expect(tipoDaVez("noite", "metas")).toBe(true);
    expect(tipoDaVez("manha", "lancar")).toBe(false);
  });
});

describe("aparelho", () => {
  it("lê a inscrição do navegador e recusa lixo", () => {
    const boa = { endpoint: "https://fcm.googleapis.com/fcm/send/abc", keys: { p256dh: "BNcR_x-1", auth: "tBHI" } };
    expect(lerInscricao(boa)).toEqual({ endpoint: boa.endpoint, p256dh: "BNcR_x-1", auth: "tBHI" });
    expect(lerInscricao({ ...boa, endpoint: "http://x" })).toBeNull();
    expect(lerInscricao({ ...boa, keys: { p256dh: "a b", auth: "x" } })).toBeNull();
    expect(lerInscricao(null)).toBeNull();
  });
  it("nome do aparelho", () => {
    expect(nomeDoAparelho("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit Version/18.0 Mobile Safari/604.1")).toBe("iPhone, Safari");
    expect(nomeDoAparelho("Mozilla/5.0 (Linux; Android 14) Chrome/130.0 Mobile Safari/537.36")).toBe("Android, Chrome");
    expect(nomeDoAparelho("Mozilla/5.0 (Windows NT 10.0) Chrome/130 Safari/537.36 Edg/130")).toBe("Windows, Edge");
  });
});

describe("lembretes", () => {
  it("confere título, dia e repetição", () => {
    expect(conferirLembrete({ titulo: "  Pagar   IPVA ", data: "2026-10-15", repetir: "" }, hoje)).toEqual({
      ok: true,
      dados: { titulo: "Pagar IPVA", data: "2026-10-15", repetir: "nao" },
    });
    expect(conferirLembrete({ titulo: "", data: "2026-10-15", repetir: "nao" }, hoje).ok).toBe(false);
    expect(conferirLembrete({ titulo: "x", data: "2026-10-07", repetir: "nao" }, hoje).ok).toBe(false);
    expect(conferirLembrete({ titulo: "x", data: "2026-02-30", repetir: "nao" }, hoje).ok).toBe(false);
    expect(conferirLembrete({ titulo: "x", data: hoje, repetir: "diario" }, hoje).ok).toBe(false);
  });
  it("próxima vez: mensal no dia 31 volta pro 31", () => {
    expect(proximaVez("2026-01-31", "mensal", "2026-01-31")).toBe("2026-02-28");
    expect(proximaVez("2026-01-31", "mensal", "2026-02-28")).toBe("2026-03-31");
    expect(proximaVez("2026-10-08", "semanal", "2026-10-20")).toBe("2026-10-22");
    expect(proximaVez("2024-02-29", "anual", "2024-02-29")).toBe("2025-02-28");
    expect(proximaVez("2026-10-08", "nao", hoje)).toBeNull();
  });
  it("concluir: uma vez sai, o que repete pula pra depois de hoje", () => {
    expect(aoConcluir({ inicio: "2026-10-01", data: "2026-10-01", repetir: "nao" }, hoje)).toEqual({ concluido: true, data: "2026-10-01" });
    expect(aoConcluir({ inicio: "2026-09-05", data: "2026-10-05", repetir: "mensal" }, hoje)).toEqual({ concluido: false, data: "2026-11-05" });
    expect(aoConcluir({ inicio: "2026-10-01", data: "2026-10-15", repetir: "semanal" }, hoje)).toEqual({ concluido: false, data: "2026-10-22" });
  });
  it("descreve a repetição", () => {
    expect(descreverRepeticao("mensal", "2026-10-15")).toBe("todo mês, dia 15");
    expect(descreverRepeticao("semanal", "2026-10-08")).toBe("toda quinta");
    expect(descreverRepeticao("semanal", "2026-10-10")).toBe("todo sábado");
    expect(descreverRepeticao("anual", "2026-10-15")).toBe("todo ano, 15 out");
  });
});
