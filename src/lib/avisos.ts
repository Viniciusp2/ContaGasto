// Avisos e notificações (1.7.3, CLAUDE.md 4.16): o que pede sua atenção agora, montado com os mesmos dados das telas.
// Funções puras, testadas. O banco junta os dados (db/avisos.ts) e o envio pro celular fica em db/push.ts.
import { textoVencimento } from "./contas";
import { diaCurto, diasNoMes, mesDe, nomeDoMes, segundaDaSemana, somarDias, type Mes } from "./datas";
import { formatarCentavos } from "./dinheiro";
import { dataEfetiva, dataNoMes } from "./recorrencias";
import { diasAtePrazo } from "./validar-emprestimo";

export const TIPOS_AVISO = [
  { valor: "contas", rotulo: "Contas a pagar", texto: "Na véspera, no dia e enquanto estiver atrasada", icone: "Receipt" },
  { valor: "entradas", rotulo: "Dia de receber", texto: "Salário, VA e outras entradas fixas, no dia", icone: "ArrowDownCircle" },
  { valor: "lembretes", rotulo: "Seus lembretes", texto: "No dia que você marcou", icone: "BellRing" },
  { valor: "emprestimos", rotulo: "Empréstimos", texto: "Prazo pra devolver ou pra cobrar", icone: "HandCoins" },
  { valor: "metas", rotulo: "Metas", texto: "Chegou em 80% e estourou", icone: "Target" },
  { valor: "ritmo", rotulo: "Ritmo do mês", texto: "Quando o dinheiro não deve dar até o fim do mês (uma vez por semana)", icone: "TrendingDown" },
  { valor: "fatura", rotulo: "Melhor dia de compra", texto: "Dia seguinte ao fechamento do cartão", icone: "CreditCard" },
  { valor: "assinaturas", rotulo: "Assinaturas", texto: "Um dia antes de renovar", icone: "Tv" },
  { valor: "objetivos", rotulo: "Objetivos", texto: "No dia do salário, quanto guardar no mês", icone: "PiggyBank" },
  { valor: "resumo", rotulo: "Resumo do mês", texto: "Dia 1: quanto entrou, saiu e sobrou", icone: "CalendarRange" },
  { valor: "lancar", rotulo: "Lembrete de lançar", texto: "À noite, se você não lançou nada no dia", icone: "PencilLine" },
] as const;

export type TipoAviso = (typeof TIPOS_AVISO)[number]["valor"];
export type Nivel = "urgente" | "atencao" | "info";

export type Aviso = {
  chave: string; // única por coisa (e por dia, quando é pra lembrar de novo): o celular não recebe a mesma duas vezes
  tipo: TipoAviso;
  nivel: Nivel;
  titulo: string;
  texto: string;
  linha?: string; // resumo de uma linha, quando vai junto com outros na mesma notificação
  href: string;
  icone: string;
  push: boolean; // vale mandar pro celular hoje (o resto só aparece na tela de Avisos)
  soNoCelular?: boolean;
  data?: string;
};

const reais = formatarCentavos;
const plural = (n: number, palavra: string) => `${n} ${palavra}${n === 1 ? "" : "s"}`;

// Atrasado não lembra todo dia: no 1º dia e depois a cada 3 (dia 1, 4, 7...)
export function relembrarAtraso(diasAtrasado: number): boolean {
  return diasAtrasado >= 1 && (diasAtrasado - 1) % 3 === 0;
}

// "hoje", "amanhã", "em 5 dias", "há 2 dias"
export function textoQuantoFalta(data: string, hoje: string): string {
  const dias = diasAtePrazo(data, hoje);
  if (dias === 0) return "hoje";
  if (dias === 1) return "amanhã";
  if (dias > 1) return `em ${dias} dias`;
  return dias === -1 ? "ontem" : `há ${-dias} dias`;
}

// ---------- Cada tipo de aviso ----------

export type ContaAviso = { chave: string; descricao: string; valor: number; vencimento: string; estimado: boolean };

export function avisosDeContas(contas: ContaAviso[], hoje: string): Aviso[] {
  return contas.flatMap((c) => {
    const dias = diasAtePrazo(c.vencimento, hoje);
    if (dias > 3) return [];
    const titulo = `${c.descricao}: ${textoVencimento(c.vencimento, hoje)}`;
    const valor = `${reais(c.valor)}${c.estimado ? ", valor estimado" : ""}`;
    return [
      {
        chave: `conta-${c.chave}-${hoje}`,
        tipo: "contas" as const,
        nivel: dias <= 0 ? ("urgente" as const) : dias === 1 ? ("atencao" as const) : ("info" as const),
        titulo,
        texto: valor,
        linha: `${titulo}, ${reais(c.valor)}`,
        href: "/pagamentos",
        icone: "Receipt",
        push: dias === 0 || dias === 1 || (dias < 0 && relembrarAtraso(-dias)),
        data: c.vencimento,
      },
    ];
  });
}

export type EntradaPrevista = {
  chave: string;
  descricao: string;
  valor: number;
  data: string;
  estimado: boolean;
  va: boolean;
  salario: boolean;
};

// No dia de receber (salário no 5º dia útil, VA no dia 25...)
export function avisosDeEntradas(entradas: EntradaPrevista[], hoje: string): Aviso[] {
  return entradas
    .filter((e) => e.data === hoje)
    .map((e) => ({
      chave: `entrada-${e.chave}`,
      tipo: "entradas" as const,
      nivel: "info" as const,
      titulo: `Dia de receber: ${e.descricao}`,
      texto: `${e.estimado ? "Cerca de " : ""}${reais(e.valor)} deve cair hoje.`,
      linha: `${e.descricao}, ${reais(e.valor)}`,
      href: "/lancamentos",
      icone: "ArrowDownCircle",
      push: true,
      data: e.data,
    }));
}

export type EmprestimoAviso = { id: string; pessoa: string; valor: number; direcao: "a_receber" | "a_pagar"; prazo: string };

export function avisosDeEmprestimos(lista: EmprestimoAviso[], hoje: string): Aviso[] {
  return lista.flatMap((e) => {
    const dias = diasAtePrazo(e.prazo, hoje);
    if (dias > 3) return [];
    let titulo: string;
    let texto = reais(e.valor);
    let nivel: Nivel;
    if (e.direcao === "a_pagar") {
      titulo =
        dias < 0
          ? `Devolver pra ${e.pessoa}: atrasado ${plural(-dias, "dia")}`
          : dias === 0
            ? `Devolver pra ${e.pessoa} hoje`
            : dias === 1
              ? `Devolver pra ${e.pessoa} amanhã`
              : `Devolver pra ${e.pessoa} em ${dias} dias`;
      nivel = dias <= 0 ? "urgente" : dias === 1 ? "atencao" : "info";
    } else {
      titulo =
        dias < 0
          ? `${e.pessoa} está devendo há ${plural(-dias, "dia")}`
          : dias === 0
            ? `${e.pessoa} ficou de devolver hoje`
            : `${e.pessoa} devolve ${dias === 1 ? "amanhã" : `em ${dias} dias`}`;
      if (dias < 0) texto += ". Que tal cobrar?";
      nivel = dias <= 0 ? "atencao" : "info";
    }
    const push = e.direcao === "a_pagar" ? dias === 0 || dias === 1 || (dias < 0 && relembrarAtraso(-dias)) : dias === 0 || (dias < 0 && relembrarAtraso(-dias));
    return [
      {
        chave: `emprestimo-${e.id}-${hoje}`,
        tipo: "emprestimos" as const,
        nivel,
        titulo,
        texto,
        linha: `${titulo}, ${reais(e.valor)}`,
        href: "/emprestimos",
        icone: "HandCoins",
        push,
        data: e.prazo,
      },
    ];
  });
}

export type MetaAviso = {
  categoriaId: string;
  categoriaNome: string;
  estado: "ok" | "atencao" | "estourou";
  fracao: number;
  falta: number;
  passou: number;
};

// Uma vez por mês em cada estado: chegou em 80% e, se passar, estourou
export function avisosDeMetas(metas: MetaAviso[], mesTexto: string): Aviso[] {
  return metas
    .filter((m) => m.estado !== "ok")
    .map((m) => {
      const estourou = m.estado === "estourou";
      return {
        chave: `meta-${m.categoriaId}-${m.estado}-${mesTexto}`,
        tipo: "metas" as const,
        nivel: estourou ? ("urgente" as const) : ("atencao" as const),
        titulo: estourou ? `${m.categoriaNome} estourou a meta` : `${m.categoriaNome}: ${Math.round(m.fracao * 100)}% da meta`,
        texto: estourou ? `Passou ${reais(m.passou)}.` : `Ainda dá ${reais(m.falta)} até o fim do mês.`,
        href: "/metas",
        icone: "Target",
        push: true,
      };
    });
}

export type Ritmo = {
  livre: number; // disponível pra gastar até o fim do mês (pode ser negativo)
  porDia: number | null;
  acabaNoDia: number | null; // no ritmo dos últimos 30 dias (só com os saldos dos bancos)
  proximaEntrada: { descricao: string; data: string } | null; // entrada fixa que ainda cai no mês
};

// Dinheiro que não dá até o fim do mês. No celular, no máximo uma vez por semana, e só depois que as entradas
// do mês caíram (antes do salário o disponível é sempre apertado: ele não conta com o que ainda vai entrar)
export function avisoDeRitmo(r: Ritmo, hoje: string): Aviso | null {
  const fimDoMes = diasNoMes(mesDe(hoje));
  const ressalva = r.proximaEntrada ? ` Sem contar ${r.proximaEntrada.descricao}, que cai ${diaCurto(r.proximaEntrada.data)}.` : "";
  const base = {
    chave: `ritmo-${segundaDaSemana(hoje)}`,
    tipo: "ritmo" as const,
    href: "/",
    icone: "TrendingDown",
    push: r.proximaEntrada === null,
  };
  if (r.livre < 0) {
    return {
      ...base,
      nivel: "urgente",
      titulo: "O disponível do mês está negativo",
      texto: `Falta ${reais(-r.livre)} pra cobrir o que ainda vence no mês.${ressalva}`,
    };
  }
  if (r.acabaNoDia !== null && r.acabaNoDia < fimDoMes) {
    return {
      ...base,
      nivel: "atencao",
      titulo: `No seu ritmo, o dinheiro acaba por volta do dia ${r.acabaNoDia}`,
      texto: `${r.porDia === null ? "Sem folga até o fim do mês." : `Pra dar até o fim do mês: até ${reais(r.porDia)} por dia.`}${ressalva}`,
    };
  }
  return null;
}

export type CartaoAviso = { id: string; nome: string; diaFechamento: number; diaVencimento: number };

// Melhor dia de compra: o dia seguinte ao fechamento (a compra só vence na fatura do mês seguinte)
export function avisosDeFatura(cartoes: CartaoAviso[], hoje: string): Aviso[] {
  const ontem = somarDias(hoje, -1);
  return cartoes.flatMap((c): Aviso[] => {
    if (dataNoMes(mesDe(ontem), c.diaFechamento) === ontem) {
      const vence = dataEfetiva(hoje, { diaFechamento: c.diaFechamento, diaVencimento: c.diaVencimento });
      return [
        {
          chave: `fatura-${c.id}-${hoje}`,
          tipo: "fatura" as const,
          nivel: "info" as const,
          titulo: `Melhor dia de compra no ${c.nome}`,
          texto: `A fatura fechou ontem: o que comprar hoje no crédito só vence ${diaCurto(vence)}.`,
          href: "/cartoes",
          icone: "CreditCard",
          push: true,
        },
      ];
    }
    if (dataNoMes(mesDe(hoje), c.diaFechamento) === hoje) {
      return [
        {
          chave: `fatura-fecha-${c.id}-${hoje}`,
          tipo: "fatura" as const,
          nivel: "info" as const,
          titulo: `A fatura do ${c.nome} fecha hoje`,
          texto: "Compra a partir de amanhã fica pra fatura seguinte.",
          href: "/cartoes",
          icone: "CreditCard",
          push: false,
        },
      ];
    }
    return [];
  });
}

export type AssinaturaAviso = { chave: string; descricao: string; valor: number; renovaEm: string };

export function avisosDeAssinaturas(lista: AssinaturaAviso[], hoje: string): Aviso[] {
  const amanha = somarDias(hoje, 1);
  return lista
    .filter((a) => a.renovaEm === amanha)
    .map((a) => ({
      chave: `assinatura-${a.chave}`,
      tipo: "assinaturas" as const,
      nivel: "info" as const,
      titulo: `${a.descricao} renova amanhã`,
      texto: `${reais(a.valor)}. Se não usa mais, ainda dá tempo de cancelar.`,
      linha: `${a.descricao}, ${reais(a.valor)}`,
      href: "/fixos",
      icone: "Tv",
      push: true,
    }));
}

export type ObjetivoAviso = { id: string; nome: string; porMes: number; guardadoNoMes: number; concluido: boolean };

// No dia de guardar (dia do salário; sem salário fixo, dia 5): objetivo que ainda não recebeu nada no mês
export function avisosDeObjetivos(lista: ObjetivoAviso[], diaDeGuardar: boolean, mesTexto: string): Aviso[] {
  if (!diaDeGuardar) return [];
  return lista
    .filter((o) => !o.concluido && o.porMes > 0 && o.guardadoNoMes <= 0)
    .map((o) => ({
      chave: `objetivo-${o.id}-${mesTexto}`,
      tipo: "objetivos" as const,
      nivel: "info" as const,
      titulo: `Hora de guardar no ${o.nome}`,
      texto: `${reais(o.porMes)} este mês mantém o plano.`,
      linha: `${o.nome}: ${reais(o.porMes)}`,
      href: "/objetivos",
      icone: "PiggyBank",
      push: true,
    }));
}

export type ResumoAviso = { mes: Mes; entradas: number; gasto: number; saldo: number };

// Nos 3 primeiros dias do mês: como foi o mês que passou
export function avisoDeResumo(r: ResumoAviso, hoje: string): Aviso | null {
  if (Number(hoje.slice(8, 10)) > 3 || (r.entradas === 0 && r.gasto === 0)) return null;
  const nome = nomeDoMes(r.mes).replace(/ de \d+$/, "");
  const mesTexto = `${r.mes.ano}-${String(r.mes.mes).padStart(2, "0")}`;
  return {
    chave: `resumo-${mesTexto}`,
    tipo: "resumo",
    nivel: "info",
    titulo: `${nome[0].toUpperCase()}${nome.slice(1)} fechou`,
    texto: `Entrou ${reais(r.entradas)} e saiu ${reais(r.gasto)}: ${r.saldo >= 0 ? `sobrou ${reais(r.saldo)}` : `faltou ${reais(-r.saldo)}`}.`,
    href: `/?mes=${mesTexto}`,
    icone: "CalendarRange",
    push: true,
  };
}

export type LembreteAviso = { id: string; titulo: string; data: string };

export function avisosDeLembretes(lista: LembreteAviso[], hoje: string): Aviso[] {
  return lista.flatMap((l) => {
    const dias = diasAtePrazo(l.data, hoje);
    if (dias > 3) return [];
    const texto =
      dias < 0
        ? `Era pra ${diaCurto(l.data)} e ainda não foi marcado como feito.`
        : dias === 0
          ? "Lembrete de hoje."
          : dias === 1
            ? "Lembrete de amanhã."
            : `Lembrete pra daqui ${dias} dias.`;
    return [
      {
        chave: `lembrete-${l.id}-${hoje}`,
        tipo: "lembretes" as const,
        nivel: dias <= 0 ? ("atencao" as const) : ("info" as const),
        titulo: l.titulo,
        texto,
        href: "/avisos#lembretes",
        icone: "BellRing",
        push: dias === 0 || (dias < 0 && relembrarAtraso(-dias)),
        data: l.data,
      },
    ];
  });
}

// À noite, se nada foi lançado no dia (o que o fixo gera sozinho não conta)
export function avisoDeLancar(lancouHoje: boolean, hoje: string): Aviso | null {
  if (lancouHoje) return null;
  return {
    chave: `lancar-${hoje}`,
    tipo: "lancar",
    nivel: "info",
    titulo: "Lançou os gastos de hoje?",
    texto: "Ainda não tem nada lançado hoje. Leva 5 segundos.",
    href: "/lancamentos/novo",
    icone: "PencilLine",
    push: true,
    soNoCelular: true,
  };
}

// ---------- Ordem, preferências e notificação ----------

const ORDEM: Record<Nivel, number> = { urgente: 0, atencao: 1, info: 2 };

export function ordenarAvisos(avisos: Aviso[]): Aviso[] {
  return [...avisos].sort(
    (a, b) => ORDEM[a.nivel] - ORDEM[b.nivel] || (a.data ?? "9999").localeCompare(b.data ?? "9999") || a.titulo.localeCompare(b.titulo),
  );
}

// O número do sino: o que é urgente ou pede atenção
export function contarAvisos(avisos: Aviso[]): number {
  return avisos.filter((a) => !a.soNoCelular && a.nivel !== "info").length;
}

export type PreferenciasAvisos = Record<TipoAviso, boolean>;

// Tudo ligado por padrão; desliga o que você desligou
export function lerPreferencias(salvo: Record<string, unknown> | null | undefined): PreferenciasAvisos {
  return Object.fromEntries(TIPOS_AVISO.map((t) => [t.valor, salvo?.[t.valor] !== false])) as PreferenciasAvisos;
}

// O agendador roda de manhã (tudo menos o lembrete de lançar) e à noite (lançar e metas)
export type Vez = "manha" | "noite";

export function tipoDaVez(vez: Vez, tipo: TipoAviso): boolean {
  return vez === "manha" ? tipo !== "lancar" : tipo === "lancar" || tipo === "metas";
}

// Quem chamar a rota fora de hora não consegue mandar nada de madrugada nem o "lançou hoje?" de manhã
export function podeRodar(vez: Vez, horaBrasil: number): boolean {
  return vez === "manha" ? horaBrasil >= 6 && horaBrasil < 14 : horaBrasil >= 18;
}

export type Notificacao = { tag: TipoAviso; titulo: string; corpo: string; url: string; avisos: Aviso[] };

const TITULO_DO_GRUPO: Record<TipoAviso, (n: number) => string> = {
  contas: (n) => `${n} contas pedindo atenção`,
  entradas: () => "Dia de receber",
  lembretes: (n) => `${n} lembretes pra hoje`,
  emprestimos: (n) => `${n} empréstimos com prazo`,
  metas: (n) => `${n} metas pedindo atenção`,
  ritmo: () => "Ritmo do mês",
  fatura: () => "Melhor dia de compra",
  assinaturas: (n) => `${n} assinaturas renovam amanhã`,
  objetivos: () => "Hora de guardar",
  resumo: () => "Resumo do mês",
  lancar: () => "Lançou os gastos de hoje?",
};

export const MAX_NOTIFICACOES = 5;

// Junta os avisos de cada tipo numa notificação só (3 contas viram uma, não três)
export function montarNotificacoes(
  avisos: Aviso[],
  { preferencias, vez, jaEnviadas }: { preferencias: PreferenciasAvisos; vez: Vez; jaEnviadas: Set<string> },
): Notificacao[] {
  const grupos = new Map<TipoAviso, Aviso[]>();
  for (const a of ordenarAvisos(avisos)) {
    if (!a.push || !preferencias[a.tipo] || !tipoDaVez(vez, a.tipo) || jaEnviadas.has(a.chave)) continue;
    grupos.set(a.tipo, [...(grupos.get(a.tipo) ?? []), a]);
  }
  return [...grupos.entries()].slice(0, MAX_NOTIFICACOES).map(([tipo, lista]) => {
    const mesmoLink = lista.every((a) => a.href === lista[0].href);
    if (lista.length === 1) return { tag: tipo, titulo: lista[0].titulo, corpo: lista[0].texto, url: lista[0].href, avisos: lista };
    const linhas = lista.slice(0, 3).map((a) => a.linha ?? a.titulo);
    if (lista.length > 3) linhas.push(`e mais ${lista.length - 3}`);
    return {
      tag: tipo,
      titulo: TITULO_DO_GRUPO[tipo](lista.length),
      corpo: linhas.join("\n"),
      url: mesmoLink ? lista[0].href : "/avisos",
      avisos: lista,
    };
  });
}

// ---------- Aparelho ----------

export type Inscricao = { endpoint: string; p256dh: string; auth: string };

const BASE64URL = /^[A-Za-z0-9_-]+={0,2}$/;

// Inscrição que o navegador manda (PushSubscription.toJSON()). Só aceita o formato certo.
export function lerInscricao(x: unknown): Inscricao | null {
  const s = x as { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } } | null;
  if (!s || typeof s.endpoint !== "string" || !s.endpoint.startsWith("https://") || s.endpoint.length > 1000) return null;
  const { p256dh, auth } = s.keys ?? {};
  if (typeof p256dh !== "string" || typeof auth !== "string") return null;
  if (!BASE64URL.test(p256dh) || !BASE64URL.test(auth) || p256dh.length > 200 || auth.length > 100) return null;
  try {
    new URL(s.endpoint);
  } catch {
    return null;
  }
  return { endpoint: s.endpoint, p256dh, auth };
}

// "iPhone, Safari", "Android, Chrome"
export function nomeDoAparelho(ua: string): string {
  const sistema = /iPhone/.test(ua)
    ? "iPhone"
    : /iPad/.test(ua)
      ? "iPad"
      : /Android/.test(ua)
        ? "Android"
        : /Windows/.test(ua)
          ? "Windows"
          : /Macintosh|Mac OS X/.test(ua)
            ? "Mac"
            : /Linux/.test(ua)
              ? "Linux"
              : "Aparelho";
  const navegador = /Edg\//.test(ua)
    ? "Edge"
    : /SamsungBrowser/.test(ua)
      ? "Samsung Internet"
      : /Firefox|FxiOS/.test(ua)
        ? "Firefox"
        : /OPR\//.test(ua)
          ? "Opera"
          : /Chrome|CriOS/.test(ua)
            ? "Chrome"
            : /Safari/.test(ua)
              ? "Safari"
              : "";
  return navegador ? `${sistema}, ${navegador}` : sistema;
}
