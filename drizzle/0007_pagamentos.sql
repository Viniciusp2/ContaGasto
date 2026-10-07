ALTER TYPE "public"."status_lancamento" ADD VALUE 'a_pagar';--> statement-breakpoint
CREATE TABLE "pagamentos_fatura" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"forma_pagamento_id" uuid NOT NULL,
	"competencia" text NOT NULL,
	"pago_em" date NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pagamentos_fatura_forma_pagamento_id_competencia_unique" UNIQUE("forma_pagamento_id","competencia")
);
--> statement-breakpoint
ALTER TABLE "lancamentos" ADD COLUMN "vencimento" date;--> statement-breakpoint
ALTER TABLE "recorrencias" ADD COLUMN "tipo_conta" text;--> statement-breakpoint
ALTER TABLE "recorrencias" ADD COLUMN "pagamento_automatico" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "pagamentos_fatura" ADD CONSTRAINT "pagamentos_fatura_user_id_usuarios_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pagamentos_fatura" ADD CONSTRAINT "pagamentos_fatura_forma_pagamento_id_formas_pagamento_id_fk" FOREIGN KEY ("forma_pagamento_id") REFERENCES "public"."formas_pagamento"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
UPDATE "lancamentos" SET "vencimento" = "data" WHERE "recorrencia_id" IS NOT NULL;
