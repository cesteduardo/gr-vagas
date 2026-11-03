ALTER TABLE "links_acesso" ADD COLUMN "confirma_senha" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "usuarios" ADD COLUMN "senha_hash" text;