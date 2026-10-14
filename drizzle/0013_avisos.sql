CREATE TABLE "aparelhos_push" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"endpoint" text NOT NULL,
	"p256dh" text NOT NULL,
	"auth" text NOT NULL,
	"nome" text NOT NULL,
	"ultimo_envio" timestamp with time zone,
	"falhas" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "aparelhos_push_endpoint_unique" UNIQUE("endpoint")
);
--> statement-breakpoint
CREATE TABLE "avisos_enviados" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"chave" text NOT NULL,
	"tipo" text NOT NULL,
	"titulo" text NOT NULL,
	"texto" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "avisos_enviados_user_id_chave_unique" UNIQUE("user_id","chave")
);
--> statement-breakpoint
CREATE TABLE "config_avisos" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"tipos" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"vapid_publica" text,
	"vapid_privada" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lembretes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"titulo" text NOT NULL,
	"inicio" date NOT NULL,
	"data" date NOT NULL,
	"repetir" text DEFAULT 'nao' NOT NULL,
	"concluido" boolean DEFAULT false NOT NULL,
	"concluido_em" date,
	"origem" text DEFAULT 'voce' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "lembretes_repetir_valido" CHECK ("lembretes"."repetir" in ('nao', 'semanal', 'mensal', 'anual'))
);
--> statement-breakpoint
ALTER TABLE "aparelhos_push" ADD CONSTRAINT "aparelhos_push_user_id_usuarios_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "avisos_enviados" ADD CONSTRAINT "avisos_enviados_user_id_usuarios_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "config_avisos" ADD CONSTRAINT "config_avisos_user_id_usuarios_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lembretes" ADD CONSTRAINT "lembretes_user_id_usuarios_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "lembretes_usuario_data_idx" ON "lembretes" USING btree ("user_id","data");