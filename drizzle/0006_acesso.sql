CREATE TABLE "acesso" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"senha_hash" text,
	"segredo_sessao" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "acesso" ADD CONSTRAINT "acesso_user_id_usuarios_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;