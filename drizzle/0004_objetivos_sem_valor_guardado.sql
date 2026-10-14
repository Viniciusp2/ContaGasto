ALTER TABLE "objetivos" DROP COLUMN "emoji";--> statement-breakpoint
ALTER TABLE "objetivos" DROP COLUMN "valor_guardado";--> statement-breakpoint
ALTER TABLE "movimentos_objetivo" ADD CONSTRAINT "movimentos_valor_nao_zero" CHECK ("movimentos_objetivo"."valor" <> 0);