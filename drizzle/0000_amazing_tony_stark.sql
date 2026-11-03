CREATE TABLE "alertas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"usuario_id" uuid NOT NULL,
	"termo" text NOT NULL,
	"cidade_slug" text NOT NULL,
	"ultimo_envio_em" timestamp with time zone,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "alertas_enviados" (
	"alerta_id" uuid NOT NULL,
	"vaga_id" uuid NOT NULL,
	CONSTRAINT "alertas_enviados_alerta_id_vaga_id_pk" PRIMARY KEY("alerta_id","vaga_id")
);
--> statement-breakpoint
CREATE TABLE "assinaturas" (
	"usuario_id" uuid PRIMARY KEY NOT NULL,
	"plano" text NOT NULL,
	"estado" text NOT NULL,
	"provedor" text NOT NULL,
	"fim_em" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "candidaturas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"vaga_id" uuid NOT NULL,
	"candidato_id" uuid NOT NULL,
	"etapa" text DEFAULT 'novo' NOT NULL,
	"vista_em" timestamp with time zone,
	"lida_empresa_em" timestamp with time zone,
	"lida_candidato_em" timestamp with time zone,
	"aviso_empresa_em" timestamp with time zone,
	"aviso_candidato_em" timestamp with time zone,
	"criada_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "candidatura_unica" UNIQUE("vaga_id","candidato_id")
);
--> statement-breakpoint
CREATE TABLE "denuncias" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"vaga_id" uuid NOT NULL,
	"motivo" text NOT NULL,
	"estado" text DEFAULT 'aberta' NOT NULL,
	"criada_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "empresas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"dono_id" uuid NOT NULL,
	"nome" text NOT NULL,
	"slug" text NOT NULL,
	"descricao" text DEFAULT '' NOT NULL,
	"logo" "bytea",
	"logo_mime" text,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "empresas_dono_id_unique" UNIQUE("dono_id"),
	CONSTRAINT "empresas_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "eventos_pagamento" (
	"id" text PRIMARY KEY NOT NULL,
	"recebido_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "links_acesso" (
	"token_hash" text PRIMARY KEY NOT NULL,
	"usuario_id" uuid NOT NULL,
	"destino" text NOT NULL,
	"expira_em" timestamp with time zone NOT NULL,
	"usado_em" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "mensagens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"candidatura_id" uuid NOT NULL,
	"autor_id" uuid NOT NULL,
	"texto" text NOT NULL,
	"criada_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "perfis" (
	"usuario_id" uuid PRIMARY KEY NOT NULL,
	"titulo" text DEFAULT '' NOT NULL,
	"cidade_slug" text DEFAULT '' NOT NULL,
	"resumo" text DEFAULT '' NOT NULL,
	"curriculo" "bytea",
	"curriculo_nome" text,
	"aceite_talentos_em" timestamp with time zone,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "salvas" (
	"usuario_id" uuid NOT NULL,
	"vaga_id" uuid NOT NULL,
	"criada_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "salvas_usuario_id_vaga_id_pk" PRIMARY KEY("usuario_id","vaga_id")
);
--> statement-breakpoint
CREATE TABLE "sessoes" (
	"token_hash" text PRIMARY KEY NOT NULL,
	"usuario_id" uuid NOT NULL,
	"expira_em" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tentativas" (
	"id" serial PRIMARY KEY NOT NULL,
	"chave" text NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "usuarios" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nome" text NOT NULL,
	"email" text NOT NULL,
	"telefone" text NOT NULL,
	"tipo" text NOT NULL,
	"email_confirmado_em" timestamp with time zone,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "usuarios_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "vagas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"empresa_id" uuid NOT NULL,
	"slug" text NOT NULL,
	"titulo" text NOT NULL,
	"area" text NOT NULL,
	"contrato" text NOT NULL,
	"modalidade" text NOT NULL,
	"cidade_slug" text NOT NULL,
	"cidade" text NOT NULL,
	"uf" text NOT NULL,
	"pais" text DEFAULT 'BR' NOT NULL,
	"moeda" text DEFAULT 'BRL' NOT NULL,
	"salario_centavos" integer,
	"descricao" text NOT NULL,
	"requisitos" text NOT NULL,
	"beneficios" text NOT NULL,
	"estado" text DEFAULT 'aberta' NOT NULL,
	"destaque" boolean DEFAULT false NOT NULL,
	"busca" text NOT NULL,
	"arte" jsonb NOT NULL,
	"imagem" "bytea",
	"imagem_mime" text,
	"publicada_em" timestamp with time zone DEFAULT now() NOT NULL,
	"expira_em" timestamp with time zone NOT NULL,
	CONSTRAINT "vagas_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "alertas" ADD CONSTRAINT "alertas_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alertas_enviados" ADD CONSTRAINT "alertas_enviados_alerta_id_alertas_id_fk" FOREIGN KEY ("alerta_id") REFERENCES "public"."alertas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alertas_enviados" ADD CONSTRAINT "alertas_enviados_vaga_id_vagas_id_fk" FOREIGN KEY ("vaga_id") REFERENCES "public"."vagas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assinaturas" ADD CONSTRAINT "assinaturas_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "candidaturas" ADD CONSTRAINT "candidaturas_vaga_id_vagas_id_fk" FOREIGN KEY ("vaga_id") REFERENCES "public"."vagas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "candidaturas" ADD CONSTRAINT "candidaturas_candidato_id_usuarios_id_fk" FOREIGN KEY ("candidato_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "denuncias" ADD CONSTRAINT "denuncias_vaga_id_vagas_id_fk" FOREIGN KEY ("vaga_id") REFERENCES "public"."vagas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "empresas" ADD CONSTRAINT "empresas_dono_id_usuarios_id_fk" FOREIGN KEY ("dono_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "links_acesso" ADD CONSTRAINT "links_acesso_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mensagens" ADD CONSTRAINT "mensagens_candidatura_id_candidaturas_id_fk" FOREIGN KEY ("candidatura_id") REFERENCES "public"."candidaturas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mensagens" ADD CONSTRAINT "mensagens_autor_id_usuarios_id_fk" FOREIGN KEY ("autor_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "perfis" ADD CONSTRAINT "perfis_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "salvas" ADD CONSTRAINT "salvas_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "salvas" ADD CONSTRAINT "salvas_vaga_id_vagas_id_fk" FOREIGN KEY ("vaga_id") REFERENCES "public"."vagas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessoes" ADD CONSTRAINT "sessoes_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vagas" ADD CONSTRAINT "vagas_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "mensagens_conversa" ON "mensagens" USING btree ("candidatura_id","criada_em");--> statement-breakpoint
CREATE INDEX "tentativas_chave" ON "tentativas" USING btree ("chave","criado_em");--> statement-breakpoint
CREATE INDEX "vagas_lista" ON "vagas" USING btree ("estado","expira_em");--> statement-breakpoint
CREATE INDEX "vagas_empresa" ON "vagas" USING btree ("empresa_id");