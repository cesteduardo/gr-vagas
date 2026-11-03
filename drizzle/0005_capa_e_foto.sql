ALTER TABLE "empresas" ADD COLUMN "capa" "bytea";--> statement-breakpoint
ALTER TABLE "empresas" ADD COLUMN "capa_mime" text;--> statement-breakpoint
ALTER TABLE "perfis" ADD COLUMN "foto" "bytea";--> statement-breakpoint
ALTER TABLE "perfis" ADD COLUMN "foto_mime" text;