CREATE TYPE "public"."direcao_emprestimo" AS ENUM('a_receber', 'a_pagar');--> statement-breakpoint
CREATE TYPE "public"."status_lancamento" AS ENUM('estimado', 'confirmado');--> statement-breakpoint
CREATE TYPE "public"."subtipo_entrada" AS ENUM('salario', 'extra', 'doacao', 'reembolso', 'emprestimo', 'outros');--> statement-breakpoint
CREATE TYPE "public"."tipo_forma_pagamento" AS ENUM('pix', 'debito', 'credito', 'dinheiro', 'boleto');--> statement-breakpoint
CREATE TYPE "public"."tipo_lancamento" AS ENUM('gasto', 'entrada');--> statement-breakpoint
CREATE TYPE "public"."tipo_recorrencia" AS ENUM('fixa', 'fixa_variavel', 'temporaria');--> statement-breakpoint
CREATE TABLE "categorias" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"nome" text NOT NULL,
	"emoji" text NOT NULL,
	"icone" text NOT NULL,
	"cor" text NOT NULL,
	"tipo" "tipo_lancamento" NOT NULL,
	"ativa" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "categorias_user_id_tipo_nome_unique" UNIQUE("user_id","tipo","nome")
);
--> statement-breakpoint
CREATE TABLE "emprestimos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"descricao" text NOT NULL,
	"pessoa" text NOT NULL,
	"valor" integer NOT NULL,
	"direcao" "direcao_emprestimo" NOT NULL,
	"data" date NOT NULL,
	"quitado" boolean DEFAULT false NOT NULL,
	"data_quitacao" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "emprestimos_valor_positivo" CHECK ("emprestimos"."valor" > 0)
);
--> statement-breakpoint
CREATE TABLE "formas_pagamento" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"nome" text NOT NULL,
	"tipo" "tipo_forma_pagamento" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "formas_pagamento_user_id_nome_unique" UNIQUE("user_id","nome")
);
--> statement-breakpoint
CREATE TABLE "lancamentos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"data" date NOT NULL,
	"descricao" text NOT NULL,
	"valor" integer NOT NULL,
	"categoria_id" uuid NOT NULL,
	"forma_pagamento_id" uuid,
	"tipo" "tipo_lancamento" NOT NULL,
	"subtipo_entrada" "subtipo_entrada",
	"recorrencia_id" uuid,
	"parcela" integer,
	"status" "status_lancamento" DEFAULT 'confirmado' NOT NULL,
	"obs" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "lancamentos_valor_positivo" CHECK ("lancamentos"."valor" > 0),
	CONSTRAINT "lancamentos_subtipo_so_em_entrada" CHECK ("lancamentos"."tipo" = 'entrada' or "lancamentos"."subtipo_entrada" is null)
);
--> statement-breakpoint
CREATE TABLE "metas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"categoria_id" uuid NOT NULL,
	"limite_mensal" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "metas_user_id_categoria_id_unique" UNIQUE("user_id","categoria_id"),
	CONSTRAINT "metas_limite_positivo" CHECK ("metas"."limite_mensal" > 0)
);
--> statement-breakpoint
CREATE TABLE "movimentos_objetivo" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"objetivo_id" uuid NOT NULL,
	"data" date NOT NULL,
	"valor" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "objetivos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"nome" text NOT NULL,
	"emoji" text NOT NULL,
	"valor_alvo" integer NOT NULL,
	"data_alvo" date NOT NULL,
	"valor_guardado" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "objetivos_alvo_positivo" CHECK ("objetivos"."valor_alvo" > 0)
);
--> statement-breakpoint
CREATE TABLE "recorrencias" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"tipo" "tipo_recorrencia" NOT NULL,
	"descricao" text NOT NULL,
	"valor" integer NOT NULL,
	"dia_do_mes" integer NOT NULL,
	"categoria_id" uuid NOT NULL,
	"forma_pagamento_id" uuid,
	"total_parcelas" integer,
	"parcela_atual" integer,
	"data_inicio" date NOT NULL,
	"data_fim" date,
	"ativa" boolean DEFAULT true NOT NULL,
	"dia_vencimento" integer,
	"valor_estimado" integer,
	"meses_media" integer DEFAULT 3 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "recorrencias_valor_positivo" CHECK ("recorrencias"."valor" > 0),
	CONSTRAINT "recorrencias_dia_valido" CHECK ("recorrencias"."dia_do_mes" between 1 and 31),
	CONSTRAINT "recorrencias_parcelas_na_temporaria" CHECK ("recorrencias"."tipo" <> 'temporaria' or "recorrencias"."total_parcelas" > 0)
);
--> statement-breakpoint
CREATE TABLE "usuarios" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nome" text NOT NULL,
	"email" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "usuarios_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "categorias" ADD CONSTRAINT "categorias_user_id_usuarios_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "emprestimos" ADD CONSTRAINT "emprestimos_user_id_usuarios_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "formas_pagamento" ADD CONSTRAINT "formas_pagamento_user_id_usuarios_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lancamentos" ADD CONSTRAINT "lancamentos_user_id_usuarios_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lancamentos" ADD CONSTRAINT "lancamentos_categoria_id_categorias_id_fk" FOREIGN KEY ("categoria_id") REFERENCES "public"."categorias"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lancamentos" ADD CONSTRAINT "lancamentos_forma_pagamento_id_formas_pagamento_id_fk" FOREIGN KEY ("forma_pagamento_id") REFERENCES "public"."formas_pagamento"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lancamentos" ADD CONSTRAINT "lancamentos_recorrencia_id_recorrencias_id_fk" FOREIGN KEY ("recorrencia_id") REFERENCES "public"."recorrencias"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "metas" ADD CONSTRAINT "metas_user_id_usuarios_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "metas" ADD CONSTRAINT "metas_categoria_id_categorias_id_fk" FOREIGN KEY ("categoria_id") REFERENCES "public"."categorias"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "movimentos_objetivo" ADD CONSTRAINT "movimentos_objetivo_user_id_usuarios_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "movimentos_objetivo" ADD CONSTRAINT "movimentos_objetivo_objetivo_id_objetivos_id_fk" FOREIGN KEY ("objetivo_id") REFERENCES "public"."objetivos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "objetivos" ADD CONSTRAINT "objetivos_user_id_usuarios_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recorrencias" ADD CONSTRAINT "recorrencias_user_id_usuarios_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recorrencias" ADD CONSTRAINT "recorrencias_categoria_id_categorias_id_fk" FOREIGN KEY ("categoria_id") REFERENCES "public"."categorias"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recorrencias" ADD CONSTRAINT "recorrencias_forma_pagamento_id_formas_pagamento_id_fk" FOREIGN KEY ("forma_pagamento_id") REFERENCES "public"."formas_pagamento"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "lancamentos_usuario_data_idx" ON "lancamentos" USING btree ("user_id","data");