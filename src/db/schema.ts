// Modelo de dados (ver CLAUDE.md, seções 4 e 5).
// Regra: todo valor em dinheiro é inteiro em centavos.
import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import type { Holerite } from "@/lib/holerite";

// ---------- Enums ----------

export const tipoLancamento = pgEnum("tipo_lancamento", ["gasto", "entrada"]);

// Seção 4.2. "emprestimo" nunca conta como renda (4.6).
export const subtipoEntrada = pgEnum("subtipo_entrada", [
  "salario",
  "extra",
  "doacao",
  "reembolso",
  "emprestimo",
  "outros",
  "beneficio", // vale alimentação: saldo à parte (4.13)
]);

export const tipoFormaPagamento = pgEnum("tipo_forma_pagamento", [
  "pix",
  "debito",
  "credito",
  "dinheiro",
  "boleto",
  "beneficio", // pagar com vale alimentação (4.13)
]);

// Seção 4.3. Lançamento sem recorrência é "único".
export const tipoRecorrencia = pgEnum("tipo_recorrencia", ["fixa", "fixa_variavel", "temporaria"]);

// Seção 4.8. Só "confirmado" entra no saldo real.
export const statusLancamento = pgEnum("status_lancamento", ["estimado", "confirmado", "a_pagar"]);

export const direcaoEmprestimo = pgEnum("direcao_emprestimo", ["a_receber", "a_pagar"]);

// ---------- Colunas comuns ----------

const id = () => uuid("id").primaryKey().defaultRandom();

const datas = () => ({
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

const donoId = () =>
  uuid("user_id")
    .notNull()
    .references(() => usuarios.id, { onDelete: "cascade" });

// ---------- Tabelas ----------

export const usuarios = pgTable("usuarios", {
  id: id(),
  nome: text("nome").notNull(),
  email: text("email").notNull().unique(),
  ...datas(),
});

export const categorias = pgTable(
  "categorias",
  {
    id: id(),
    userId: donoId(),
    nome: text("nome").notNull(),
    emoji: text("emoji").notNull(),
    // Nome do ícone do lucide-react (ex. "ShoppingCart")
    icone: text("icone").notNull(),
    cor: text("cor").notNull(),
    tipo: tipoLancamento("tipo").notNull(),
    ativa: boolean("ativa").notNull().default(true),
    ...datas(),
  },
  (t) => [unique().on(t.userId, t.tipo, t.nome)],
);

export const formasPagamento = pgTable(
  "formas_pagamento",
  {
    id: id(),
    userId: donoId(),
    nome: text("nome").notNull(),
    tipo: tipoFormaPagamento("tipo").notNull(),
    // Só crédito (4.4). Sem os dois, a compra conta no dia.
    diaFechamento: integer("dia_fechamento"),
    diaVencimento: integer("dia_vencimento"),
    ...datas(),
  },
  (t) => [
    unique().on(t.userId, t.nome),
    check("formas_dias_validos", sql`(${t.diaFechamento} between 1 and 31) and (${t.diaVencimento} between 1 and 31)`),
  ],
);

// Contas/bancos (começo da 4.11): de qual banco saiu ou entrou o dinheiro. Na tela vira um selo com sigla e cor.
export const contas = pgTable(
  "contas",
  {
    id: id(),
    userId: donoId(),
    nome: text("nome").notNull(),
    sigla: text("sigla").notNull(),
    cor: text("cor").notNull(), // fundo do selo
    corTexto: text("cor_texto").notNull(), // texto do selo, escolhido pelo contraste
    // Saldo que você informou (o que o banco mostrava no fim desse dia). Daí pra frente o app soma os lançamentos.
    saldoBase: integer("saldo_base"),
    saldoBaseEm: date("saldo_base_em"),
    ...datas(),
  },
  (t) => [unique().on(t.userId, t.nome)],
);

export const recorrencias = pgTable(
  "recorrencias",
  {
    id: id(),
    userId: donoId(),
    tipo: tipoRecorrencia("tipo").notNull(),
    descricao: text("descricao").notNull(),
    // Na fixa variável é o valor digitado na criação (usado enquanto não há histórico)
    valor: integer("valor").notNull(),
    diaDoMes: integer("dia_do_mes").notNull(),
    categoriaId: uuid("categoria_id")
      .notNull()
      .references(() => categorias.id),
    formaPagamentoId: uuid("forma_pagamento_id").references(() => formasPagamento.id),
    // Temporária (parcelado): parcela X/N
    totalParcelas: integer("total_parcelas"),
    parcelaAtual: integer("parcela_atual"),
    dataInicio: date("data_inicio").notNull(),
    dataFim: date("data_fim"),
    ativa: boolean("ativa").notNull().default(true),
    // Fixa variável (4.8)
    diaVencimento: integer("dia_vencimento"),
    valorEstimado: integer("valor_estimado"),
    mesesMedia: integer("meses_media").notNull().default(3),
    // "YYYY-MM" da última ocorrência já gerada. Assim, lançamento apagado não volta.
    geradaAte: text("gerada_ate"),
    // Nº dia útil do mês (-1 = último). Null = cai no dia_do_mes.
    diaUtil: integer("dia_util"),
    sabadoUtil: boolean("sabado_util").notNull().default(true),
    // Pagamentos do mês (6.1): tipo da conta (luz, água...) e se sai sozinho (débito automático)
    tipoConta: text("tipo_conta"),
    pagamentoAutomatico: boolean("pagamento_automatico").notNull().default(false),
    // Banco de onde sai (1.6.5): os lançamentos gerados já nascem com ele, pro saldo do banco bater
    contaId: uuid("conta_id").references(() => contas.id, { onDelete: "set null" }),
    ...datas(),
  },
  (t) => [
    check("recorrencias_valor_positivo", sql`${t.valor} > 0`),
    check("recorrencias_dia_valido", sql`${t.diaDoMes} between 1 and 31`),
    check(
      "recorrencias_parcelas_na_temporaria",
      sql`${t.tipo} <> 'temporaria' or ${t.totalParcelas} > 0`,
    ),
  ],
);

export const lancamentos = pgTable(
  "lancamentos",
  {
    id: id(),
    userId: donoId(),
    data: date("data").notNull(),
    descricao: text("descricao").notNull(),
    // Sempre positivo. O sentido vem do "tipo".
    valor: integer("valor").notNull(),
    categoriaId: uuid("categoria_id")
      .notNull()
      .references(() => categorias.id),
    formaPagamentoId: uuid("forma_pagamento_id").references(() => formasPagamento.id),
    // Banco do lançamento (opcional)
    contaId: uuid("conta_id").references(() => contas.id, { onDelete: "set null" }),
    tipo: tipoLancamento("tipo").notNull(),
    subtipoEntrada: subtipoEntrada("subtipo_entrada"),
    recorrenciaId: uuid("recorrencia_id").references(() => recorrencias.id, {
      onDelete: "set null",
    }),
    // Número desta parcela, pra mostrar "parcela X/N"
    parcela: integer("parcela"),
    status: statusLancamento("status").notNull().default("confirmado"),
    // "data" é quando o dinheiro sai. No crédito é o vencimento da fatura, e a compra fica aqui.
    dataCompra: date("data_compra"),
    // "YYYY-MM" da ocorrência, só em lançamento gerado por recorrência
    competencia: text("competencia"),
    // Quando a conta vence. Ao marcar "Paguei", "data" vira o dia do pagamento e isto fica.
    vencimento: date("vencimento"),
    // Só no salário, só pra consulta: bruto e descontos. O valor é o líquido (4.2).
    holerite: jsonb("holerite").$type<Holerite>(),
    obs: text("obs"),
    ...datas(),
  },
  (t) => [
    index("lancamentos_usuario_data_idx").on(t.userId, t.data),
    // Uma recorrência gera no máximo um lançamento por mês, mesmo com o app aberto em duas abas
    uniqueIndex("lancamentos_recorrencia_competencia_uq")
      .on(t.recorrenciaId, t.competencia)
      .where(sql`${t.recorrenciaId} is not null`),
    check("lancamentos_valor_positivo", sql`${t.valor} > 0`),
    check(
      "lancamentos_subtipo_so_em_entrada",
      sql`${t.tipo} = 'entrada' or ${t.subtipoEntrada} is null`,
    ),
  ],
);

export const metas = pgTable(
  "metas",
  {
    id: id(),
    userId: donoId(),
    categoriaId: uuid("categoria_id")
      .notNull()
      .references(() => categorias.id, { onDelete: "cascade" }),
    limiteMensal: integer("limite_mensal").notNull(),
    ...datas(),
  },
  (t) => [
    unique().on(t.userId, t.categoriaId),
    check("metas_limite_positivo", sql`${t.limiteMensal} > 0`),
  ],
);

export const objetivos = pgTable(
  "objetivos",
  {
    id: id(),
    userId: donoId(),
    nome: text("nome").notNull(),
    // Ícone lucide (sem emoji na interface). O saldo não é gravado: é a soma de movimentos_objetivo.
    icone: text("icone").notNull().default("PiggyBank"),
    valorAlvo: integer("valor_alvo").notNull(),
    dataAlvo: date("data_alvo").notNull(),
    ...datas(),
  },
  (t) => [check("objetivos_alvo_positivo", sql`${t.valorAlvo} > 0`)],
);

export const movimentosObjetivo = pgTable("movimentos_objetivo", {
  id: id(),
  userId: donoId(),
  objetivoId: uuid("objetivo_id")
    .notNull()
    .references(() => objetivos.id, { onDelete: "cascade" }),
  data: date("data").notNull(),
  // Positivo = guardar, negativo = resgatar
  valor: integer("valor").notNull(),
  ...datas(),
}, (t) => [check("movimentos_valor_nao_zero", sql`${t.valor} <> 0`)]);

export const emprestimos = pgTable(
  "emprestimos",
  {
    id: id(),
    userId: donoId(),
    descricao: text("descricao").notNull(),
    pessoa: text("pessoa").notNull(),
    valor: integer("valor").notNull(),
    direcao: direcaoEmprestimo("direcao").notNull(),
    data: date("data").notNull(),
    quitado: boolean("quitado").notNull().default(false),
    dataQuitacao: date("data_quitacao"),
    // Prazo combinado pra devolver (opcional)
    prazo: date("prazo"),
    // "Não vai voltar": o dinheiro saiu de vez (4.6)
    perdido: boolean("perdido").notNull().default(false),
    // Gasto criado ao quitar ("paguei") ou perder. Reabrir apaga ele.
    lancamentoId: uuid("lancamento_id").references(() => lancamentos.id, { onDelete: "set null" }),
    ...datas(),
  },
  (t) => [check("emprestimos_valor_positivo", sql`${t.valor} > 0`)],
);

// Acesso (login com senha única): uma linha por usuário. A senha nunca é guardada, só o hash (scrypt).
// O segredo assina o cookie da sessão; trocar a senha troca o segredo e derruba as outras sessões.
export const acesso = pgTable("acesso", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => usuarios.id, { onDelete: "cascade" }),
  senhaHash: text("senha_hash"), // null = ainda na senha inicial (1234)
  segredoSessao: text("segredo_sessao").notNull(),
  // Dois fatores (1.8.0): segredo do app autenticador, só vale depois de confirmado com um código
  totpSegredo: text("totp_segredo"),
  totpPendente: text("totp_pendente"), // gerado na ativação, esperando o primeiro código
  totpUltimoPasso: integer("totp_ultimo_passo"), // o mesmo código não entra duas vezes
  codigosRecuperacao: jsonb("codigos_recuperacao").$type<string[]>(), // só os hashes
  // Trava contra força bruta (senha ou código)
  errosSeguidos: integer("erros_seguidos").notNull().default(0),
  bloqueadoAte: timestamp("bloqueado_ate", { withTimezone: true }),
  ...datas(),
});

// Fatura do cartão marcada como paga (6.1). Só controle: os gastos do cartão já contam no vencimento (4.4).
export const pagamentosFatura = pgTable(
  "pagamentos_fatura",
  {
    id: id(),
    userId: donoId(),
    formaPagamentoId: uuid("forma_pagamento_id")
      .notNull()
      .references(() => formasPagamento.id, { onDelete: "cascade" }),
    // "YYYY-MM" do mês em que a fatura vence
    competencia: text("competencia").notNull(),
    pagoEm: date("pago_em").notNull(),
    ...datas(),
  },
  (t) => [unique().on(t.formaPagamentoId, t.competencia)],
);

// Conferir: pares de "possível repetido" que você disse que estão certos (não aparecem mais)
export const conferenciasIgnoradas = pgTable(
  "conferencias_ignoradas",
  {
    id: id(),
    userId: donoId(),
    chave: text("chave").notNull(),
    ...datas(),
  },
  (t) => [unique().on(t.userId, t.chave)],
);

// ---------- Avisos e lembretes (1.7.3, 4.16) ----------

// O que você (ou o assistente) pediu pra lembrar. Repetido: "data" é a próxima vez, contada a partir de "inicio".
export const lembretes = pgTable(
  "lembretes",
  {
    id: id(),
    userId: donoId(),
    titulo: text("titulo").notNull(),
    inicio: date("inicio").notNull(),
    data: date("data").notNull(),
    repetir: text("repetir").notNull().default("nao"), // nao | semanal | mensal | anual
    concluido: boolean("concluido").notNull().default(false),
    concluidoEm: date("concluido_em"),
    origem: text("origem").notNull().default("voce"), // voce | assistente
    ...datas(),
  },
  (t) => [
    index("lembretes_usuario_data_idx").on(t.userId, t.data),
    check("lembretes_repetir_valido", sql`${t.repetir} in ('nao', 'semanal', 'mensal', 'anual')`),
  ],
);

// Celulares e navegadores que recebem notificação (Web Push). Um por inscrição do navegador.
export const aparelhosPush = pgTable("aparelhos_push", {
  id: id(),
  userId: donoId(),
  endpoint: text("endpoint").notNull().unique(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  nome: text("nome").notNull(), // "iPhone, Safari"
  ultimoEnvio: timestamp("ultimo_envio", { withTimezone: true }),
  falhas: integer("falhas").notNull().default(0),
  ...datas(),
});

// Que avisos mandar e as chaves do Web Push (VAPID), criadas na primeira vez, como o segredo da sessão
export const configAvisos = pgTable("config_avisos", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => usuarios.id, { onDelete: "cascade" }),
  tipos: jsonb("tipos").$type<Record<string, boolean>>().notNull().default({}),
  vapidPublica: text("vapid_publica"),
  vapidPrivada: text("vapid_privada"),
  ...datas(),
});

// Cada aviso que já foi pro celular: o mesmo não vai duas vezes (o agendador pode rodar de novo) e vira o histórico
export const avisosEnviados = pgTable(
  "avisos_enviados",
  {
    id: id(),
    userId: donoId(),
    chave: text("chave").notNull(),
    tipo: text("tipo").notNull(),
    titulo: text("titulo").notNull(),
    texto: text("texto").notNull(),
    ...datas(),
  },
  (t) => [unique().on(t.userId, t.chave)],
);

// Registro do que acontece no app (área Dev): chamadas da IA, erros, testes. Fica fora do backup e
// some sozinho depois de 30 dias. Nunca guarda senha, chave ou segredo.
export const logs = pgTable(
  "logs",
  {
    id: id(),
    userId: donoId(),
    nivel: text("nivel").notNull().default("info"), // info | aviso | erro
    origem: text("origem").notNull(), // assistente, ia, dev...
    mensagem: text("mensagem").notNull(),
    detalhe: jsonb("detalhe"),
    ...datas(),
  },
  (t) => [
    index("logs_usuario_criado_idx").on(t.userId, t.createdAt),
    check("logs_nivel_valido", sql`${t.nivel} in ('info', 'aviso', 'erro')`),
  ],
);
