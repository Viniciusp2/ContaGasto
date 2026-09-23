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
export const statusLancamento = pgEnum("status_lancamento", ["estimado", "confirmado"]);

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
    emoji: text("emoji").notNull(),
    valorAlvo: integer("valor_alvo").notNull(),
    dataAlvo: date("data_alvo").notNull(),
    valorGuardado: integer("valor_guardado").notNull().default(0),
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
});

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
    ...datas(),
  },
  (t) => [check("emprestimos_valor_positivo", sql`${t.valor} > 0`)],
);
