CREATE TABLE "logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"nivel" text DEFAULT 'info' NOT NULL,
	"origem" text NOT NULL,
	"mensagem" text NOT NULL,
	"detalhe" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "logs_nivel_valido" CHECK ("logs"."nivel" in ('info', 'aviso', 'erro'))
);
--> statement-breakpoint
ALTER TABLE "logs" ADD CONSTRAINT "logs_user_id_usuarios_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "logs_usuario_criado_idx" ON "logs" USING btree ("user_id","created_at");