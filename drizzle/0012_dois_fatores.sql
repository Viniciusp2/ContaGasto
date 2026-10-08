ALTER TABLE "acesso" ADD COLUMN "totp_segredo" text;--> statement-breakpoint
ALTER TABLE "acesso" ADD COLUMN "totp_pendente" text;--> statement-breakpoint
ALTER TABLE "acesso" ADD COLUMN "totp_ultimo_passo" integer;--> statement-breakpoint
ALTER TABLE "acesso" ADD COLUMN "codigos_recuperacao" jsonb;--> statement-breakpoint
ALTER TABLE "acesso" ADD COLUMN "erros_seguidos" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "acesso" ADD COLUMN "bloqueado_ate" timestamp with time zone;