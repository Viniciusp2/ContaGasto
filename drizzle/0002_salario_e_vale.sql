ALTER TYPE "public"."subtipo_entrada" ADD VALUE 'beneficio';--> statement-breakpoint
ALTER TYPE "public"."tipo_forma_pagamento" ADD VALUE 'beneficio';--> statement-breakpoint
ALTER TABLE "lancamentos" ADD COLUMN "holerite" jsonb;--> statement-breakpoint
ALTER TABLE "recorrencias" ADD COLUMN "dia_util" integer;--> statement-breakpoint
ALTER TABLE "recorrencias" ADD COLUMN "sabado_util" boolean DEFAULT true NOT NULL;