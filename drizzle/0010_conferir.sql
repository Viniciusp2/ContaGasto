CREATE TABLE "conferencias_ignoradas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"chave" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "conferencias_ignoradas_user_id_chave_unique" UNIQUE("user_id","chave")
);
--> statement-breakpoint
ALTER TABLE "conferencias_ignoradas" ADD CONSTRAINT "conferencias_ignoradas_user_id_usuarios_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;