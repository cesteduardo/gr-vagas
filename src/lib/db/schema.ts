import { boolean, customType, integer, jsonb, pgTable, primaryKey, serial, text, timestamp, unique, uuid, index } from 'drizzle-orm/pg-core';

const bytes = customType<{ data: Buffer }>({ dataType: () => 'bytea' });
const quando = (nome: string) => timestamp(nome, { withTimezone: true });
const id = () => uuid('id').primaryKey().defaultRandom();

export const usuarios = pgTable('usuarios', {
  id: id(),
  nome: text('nome').notNull(),
  email: text('email').notNull().unique(),
  telefone: text('telefone').notNull(),
  tipo: text('tipo').$type<'contratante' | 'candidato'>().notNull(),
  senhaHash: text('senha_hash'),
  emailConfirmadoEm: quando('email_confirmado_em'),
  criadoEm: quando('criado_em').notNull().defaultNow(),
});

export const sessoes = pgTable('sessoes', {
  tokenHash: text('token_hash').primaryKey(),
  usuarioId: uuid('usuario_id').notNull().references(() => usuarios.id, { onDelete: 'cascade' }),
  expiraEm: quando('expira_em').notNull(),
});

export const linksAcesso = pgTable('links_acesso', {
  tokenHash: text('token_hash').primaryKey(),
  usuarioId: uuid('usuario_id').notNull().references(() => usuarios.id, { onDelete: 'cascade' }),
  destino: text('destino').notNull(),
  confirmaSenha: boolean('confirma_senha').notNull().default(false),
  expiraEm: quando('expira_em').notNull(),
  usadoEm: quando('usado_em'),
});

export const tentativas = pgTable('tentativas', {
  id: serial('id').primaryKey(),
  chave: text('chave').notNull(),
  criadoEm: quando('criado_em').notNull().defaultNow(),
}, (t) => [index('tentativas_chave').on(t.chave, t.criadoEm)]);

export const empresas = pgTable('empresas', {
  id: id(),
  donoId: uuid('dono_id').notNull().unique().references(() => usuarios.id, { onDelete: 'cascade' }),
  nome: text('nome').notNull(),
  slug: text('slug').notNull().unique(),
  descricao: text('descricao').notNull().default(''),
  perfil: jsonb('perfil').$type<import('@/lib/empresa').PerfilEmpresa>().notNull().default({}),
  logo: bytes('logo'),
  logoMime: text('logo_mime'),
  capa: bytes('capa'),
  capaMime: text('capa_mime'),
  criadoEm: quando('criado_em').notNull().defaultNow(),
});

export type ConfigArte = { modelo: string; formato: string; fundo: string; destaque: string; texto: string; fonte: string; chamada: string; qr: 'vaga' | 'whatsapp'; qrEstilo: 'suave' | 'pontos'; whatsapp: string; destaques?: string[]; tituloArte?: string; alinhamento?: 'esquerda' | 'centro'; posicao?: 'topo' | 'meio' | 'base'; focoX?: number; focoY?: number };

export const vagas = pgTable('vagas', {
  id: id(),
  empresaId: uuid('empresa_id').notNull().references(() => empresas.id, { onDelete: 'cascade' }),
  slug: text('slug').notNull().unique(),
  titulo: text('titulo').notNull(),
  area: text('area').notNull(),
  contrato: text('contrato').notNull(),
  modalidade: text('modalidade').notNull(),
  cidadeSlug: text('cidade_slug').notNull(),
  cidade: text('cidade').notNull(),
  uf: text('uf').notNull(),
  pais: text('pais').notNull().default('BR'),
  moeda: text('moeda').notNull().default('BRL'),
  salarioCentavos: integer('salario_centavos'),
  descricao: text('descricao').notNull(),
  requisitos: text('requisitos').notNull(),
  beneficios: text('beneficios').notNull(),
  tags: jsonb('tags').$type<string[]>().notNull().default([]),
  estado: text('estado').$type<'aberta' | 'pausada' | 'encerrada'>().notNull().default('aberta'),
  destaque: boolean('destaque').notNull().default(false),
  busca: text('busca').notNull(),
  arte: jsonb('arte').$type<ConfigArte>().notNull(),
  imagem: bytes('imagem'),
  imagemMime: text('imagem_mime'),
  publicadaEm: quando('publicada_em').notNull().defaultNow(),
  expiraEm: quando('expira_em').notNull(),
}, (t) => [index('vagas_lista').on(t.estado, t.expiraEm), index('vagas_empresa').on(t.empresaId)]);

export const candidaturas = pgTable('candidaturas', {
  id: id(),
  vagaId: uuid('vaga_id').notNull().references(() => vagas.id, { onDelete: 'cascade' }),
  candidatoId: uuid('candidato_id').notNull().references(() => usuarios.id, { onDelete: 'cascade' }),
  etapa: text('etapa').notNull().default('novo'),
  vistaEm: quando('vista_em'),
  lidaEmpresaEm: quando('lida_empresa_em'),
  lidaCandidatoEm: quando('lida_candidato_em'),
  avisoEmpresaEm: quando('aviso_empresa_em'),
  avisoCandidatoEm: quando('aviso_candidato_em'),
  criadaEm: quando('criada_em').notNull().defaultNow(),
}, (t) => [unique('candidatura_unica').on(t.vagaId, t.candidatoId)]);

export const mensagens = pgTable('mensagens', {
  id: id(),
  candidaturaId: uuid('candidatura_id').notNull().references(() => candidaturas.id, { onDelete: 'cascade' }),
  autorId: uuid('autor_id').notNull().references(() => usuarios.id, { onDelete: 'cascade' }),
  texto: text('texto').notNull(),
  criadaEm: quando('criada_em').notNull().defaultNow(),
}, (t) => [index('mensagens_conversa').on(t.candidaturaId, t.criadaEm)]);

export const perfis = pgTable('perfis', {
  usuarioId: uuid('usuario_id').primaryKey().references(() => usuarios.id, { onDelete: 'cascade' }),
  titulo: text('titulo').notNull().default(''),
  cidadeSlug: text('cidade_slug').notNull().default(''),
  resumo: text('resumo').notNull().default(''),
  curriculo: bytes('curriculo'),
  curriculoNome: text('curriculo_nome'),
  foto: bytes('foto'),
  fotoMime: text('foto_mime'),
  aceiteTalentosEm: quando('aceite_talentos_em'),
  // Empresas com conta veem o perfil (sem contato); o candidato pode esconder.
  visivelEmpresas: boolean('visivel_empresas').notNull().default(true),
  cv: jsonb('cv').$type<import('@/lib/curriculo').Cv>().notNull().default({}),
  atualizadoEm: quando('atualizado_em').notNull().defaultNow(),
});

export const salvas = pgTable('salvas', {
  usuarioId: uuid('usuario_id').notNull().references(() => usuarios.id, { onDelete: 'cascade' }),
  vagaId: uuid('vaga_id').notNull().references(() => vagas.id, { onDelete: 'cascade' }),
  criadaEm: quando('criada_em').notNull().defaultNow(),
}, (t) => [primaryKey({ columns: [t.usuarioId, t.vagaId] })]);

export const alertas = pgTable('alertas', {
  id: id(),
  usuarioId: uuid('usuario_id').notNull().references(() => usuarios.id, { onDelete: 'cascade' }),
  termo: text('termo').notNull(),
  cidadeSlug: text('cidade_slug').notNull(),
  ultimoEnvioEm: quando('ultimo_envio_em'),
  criadoEm: quando('criado_em').notNull().defaultNow(),
});

export const alertasEnviados = pgTable('alertas_enviados', {
  alertaId: uuid('alerta_id').notNull().references(() => alertas.id, { onDelete: 'cascade' }),
  vagaId: uuid('vaga_id').notNull().references(() => vagas.id, { onDelete: 'cascade' }),
}, (t) => [primaryKey({ columns: [t.alertaId, t.vagaId] })]);

export const assinaturas = pgTable('assinaturas', {
  usuarioId: uuid('usuario_id').primaryKey().references(() => usuarios.id, { onDelete: 'cascade' }),
  plano: text('plano').notNull(),
  estado: text('estado').$type<'ativa' | 'cancelada'>().notNull(),
  provedor: text('provedor').notNull(),
  fimEm: quando('fim_em').notNull(),
});

export const eventosPagamento = pgTable('eventos_pagamento', {
  id: text('id').primaryKey(),
  recebidoEm: quando('recebido_em').notNull().defaultNow(),
});

export const denuncias = pgTable('denuncias', {
  id: id(),
  vagaId: uuid('vaga_id').notNull().references(() => vagas.id, { onDelete: 'cascade' }),
  motivo: text('motivo').notNull(),
  estado: text('estado').$type<'aberta' | 'resolvida'>().notNull().default('aberta'),
  criadaEm: quando('criada_em').notNull().defaultNow(),
});
