ALTER TABLE "emprestimos" ADD COLUMN "prazo" date;--> statement-breakpoint
ALTER TABLE "emprestimos" ADD COLUMN "perdido" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "emprestimos" ADD COLUMN "lancamento_id" uuid;--> statement-breakpoint
ALTER TABLE "emprestimos" ADD CONSTRAINT "emprestimos_lancamento_id_lancamentos_id_fk" FOREIGN KEY ("lancamento_id") REFERENCES "public"."lancamentos"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
-- Empréstimo agora é cadastrado na tela de Empréstimos (4.6), não como entrada
UPDATE "categorias" SET "ativa" = false WHERE "nome" = 'Empréstimo recebido' AND "tipo" = 'entrada';
