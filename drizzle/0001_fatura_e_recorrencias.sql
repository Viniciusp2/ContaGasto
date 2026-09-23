ALTER TABLE "formas_pagamento" ADD COLUMN "dia_fechamento" integer;--> statement-breakpoint
ALTER TABLE "formas_pagamento" ADD COLUMN "dia_vencimento" integer;--> statement-breakpoint
ALTER TABLE "lancamentos" ADD COLUMN "data_compra" date;--> statement-breakpoint
ALTER TABLE "lancamentos" ADD COLUMN "competencia" text;--> statement-breakpoint
ALTER TABLE "recorrencias" ADD COLUMN "gerada_ate" text;--> statement-breakpoint
CREATE UNIQUE INDEX "lancamentos_recorrencia_competencia_uq" ON "lancamentos" USING btree ("recorrencia_id","competencia") WHERE "lancamentos"."recorrencia_id" is not null;--> statement-breakpoint
ALTER TABLE "formas_pagamento" ADD CONSTRAINT "formas_dias_validos" CHECK (("formas_pagamento"."dia_fechamento" between 1 and 31) and ("formas_pagamento"."dia_vencimento" between 1 and 31));--> statement-breakpoint
-- Lançamentos antigos: a compra foi no mesmo dia em que o dinheiro saiu
UPDATE "lancamentos" SET "data_compra" = "data" WHERE "data_compra" IS NULL;
