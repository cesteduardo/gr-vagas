CREATE TABLE "pedidos_impulso" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"vaga_id" uuid NOT NULL,
	"empresa_id" uuid NOT NULL,
	"dias" integer NOT NULL,
	"valor_centavos" integer NOT NULL,
	"estado" text DEFAULT 'aberto' NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"resolvido_em" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "vagas" ADD COLUMN "impulso_ate" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "pedidos_impulso" ADD CONSTRAINT "pedidos_impulso_vaga_id_vagas_id_fk" FOREIGN KEY ("vaga_id") REFERENCES "public"."vagas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pedidos_impulso" ADD CONSTRAINT "pedidos_impulso_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "pedidos_impulso_estado" ON "pedidos_impulso" USING btree ("estado","criado_em");