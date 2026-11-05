CREATE TABLE "cobrancas" (
	"id" text PRIMARY KEY NOT NULL,
	"tipo" text NOT NULL,
	"usuario_id" uuid NOT NULL,
	"plano" text,
	"pedido_impulso_id" uuid,
	"valor_centavos" integer NOT NULL,
	"link" text NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"pago_em" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "assinaturas" ADD COLUMN "aviso_renovacao_em" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "pedidos_impulso" ADD COLUMN "pago_em" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "cobrancas" ADD CONSTRAINT "cobrancas_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cobrancas" ADD CONSTRAINT "cobrancas_pedido_impulso_id_pedidos_impulso_id_fk" FOREIGN KEY ("pedido_impulso_id") REFERENCES "public"."pedidos_impulso"("id") ON DELETE set null ON UPDATE no action;