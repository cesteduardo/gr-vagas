import { and, asc, desc, eq, gt, isNull, or, sql } from 'drizzle-orm';
import { abrirSessao } from '@/lib/auth/contas';
import { ETAPAS, URL_SITE, type Etapa } from '@/lib/config';
import type { Banco } from '@/lib/db/client';
import { assinaturas, candidaturas, empresas, mensagens, perfis, usuarios, vagas } from '@/lib/db/schema';
import { enviarEmail, type EnviarEmail } from '@/lib/email';
import { vagaAceitaCandidatura } from '@/lib/vagas';

const INTERVALO_AVISO_MS = 15 * 60 * 1000;
export const MAX_MENSAGEM = 2000;

type Resultado = { ok: true; candidaturaId: string; sessao?: string } | { ok: false; erro: string; contaExistente?: boolean };

async function vagaAberta(db: Banco, vagaId: string) {
  const [v] = await db.select({ estado: vagas.estado, expiraEm: vagas.expiraEm }).from(vagas).where(eq(vagas.id, vagaId));
  return v && vagaAceitaCandidatura(v);
}

// Conta existente precisa provar que é dona do e-mail: sem isso, qualquer um
// poderia se candidatar em nome de outra pessoa ou entrar na conta dela.
export async function candidatarSemConta(db: Banco, d: { nome: string; email: string; telefone: string; vagaId: string }): Promise<Resultado> {
  if (!(await vagaAberta(db, d.vagaId))) return { ok: false, erro: 'Esta vaga não recebe mais candidaturas.' };
  const r = await db.transaction(async (tx) => {
    const [u] = await tx.insert(usuarios).values({ nome: d.nome, email: d.email, telefone: d.telefone, tipo: 'candidato' }).onConflictDoNothing().returning({ id: usuarios.id });
    if (!u) return null;
    await tx.insert(perfis).values({ usuarioId: u.id });
    const [c] = await tx.insert(candidaturas).values({ vagaId: d.vagaId, candidatoId: u.id }).returning({ id: candidaturas.id });
    return { usuarioId: u.id, candidaturaId: c!.id };
  });
  if (!r) return { ok: false, erro: 'Este e-mail já tem conta. Enviamos um link para você entrar e se candidatar.', contaExistente: true };
  return { ok: true, candidaturaId: r.candidaturaId, sessao: await abrirSessao(db, r.usuarioId) };
}

export async function candidatarLogado(db: Banco, usuario: { id: string; tipo: string }, vagaId: string): Promise<Resultado> {
  if (usuario.tipo !== 'candidato') return { ok: false, erro: 'Para se candidatar, use uma conta de candidato.' };
  const [ja] = await db.select({ id: candidaturas.id }).from(candidaturas).where(and(eq(candidaturas.vagaId, vagaId), eq(candidaturas.candidatoId, usuario.id)));
  if (ja) return { ok: true, candidaturaId: ja.id };
  if (!(await vagaAberta(db, vagaId))) return { ok: false, erro: 'Esta vaga não recebe mais candidaturas.' };
  const [c] = await db.insert(candidaturas).values({ vagaId, candidatoId: usuario.id }).onConflictDoNothing().returning({ id: candidaturas.id });
  if (c) return { ok: true, candidaturaId: c.id };
  const [existente] = await db.select({ id: candidaturas.id }).from(candidaturas).where(and(eq(candidaturas.vagaId, vagaId), eq(candidaturas.candidatoId, usuario.id)));
  return { ok: true, candidaturaId: existente!.id };
}

export async function avisarNovaCandidatura(db: Banco, candidaturaId: string, enviar: EnviarEmail = enviarEmail) {
  const [l] = await db
    .select({ email: usuarios.email, titulo: vagas.titulo, id: vagas.id })
    .from(candidaturas)
    .innerJoin(vagas, eq(vagas.id, candidaturas.vagaId))
    .innerJoin(empresas, eq(empresas.id, vagas.empresaId))
    .innerJoin(usuarios, eq(usuarios.id, empresas.donoId))
    .where(eq(candidaturas.id, candidaturaId));
  if (l) await enviar(l.email, `Nova candidatura: ${l.titulo}`, `Você recebeu uma candidatura para ${l.titulo}.\n\nVeja em ${URL_SITE}/painel/vagas/${l.id}`);
}

export type Papel = 'empresa' | 'candidato';
export type Acesso = { papel: Papel; candidaturaId: string; vagaId: string; vagaTitulo: string; vagaSlug: string; empresaNome: string; empresaSlug: string; donoId: string; candidatoId: string; candidatoNome: string; candidatoEmail: string; candidatoTelefone: string; etapa: string; vistaEm: Date | null; perfilTitulo: string | null; perfilResumo: string | null; temCurriculo: boolean; avisoEmpresaEm: Date | null; avisoCandidatoEm: Date | null };

// Toda leitura de conversa, currículo ou etapa passa por aqui. Sem vínculo, a
// candidatura é tratada como inexistente.
export async function acessoCandidatura(db: Banco, candidaturaId: string, usuarioId: string): Promise<Acesso | null> {
  if (!/^[0-9a-f-]{36}$/i.test(candidaturaId)) return null;
  const [l] = await db
    .select({
      candidaturaId: candidaturas.id, vagaId: vagas.id, vagaTitulo: vagas.titulo, vagaSlug: vagas.slug, empresaNome: empresas.nome, empresaSlug: empresas.slug, donoId: empresas.donoId, candidatoId: candidaturas.candidatoId,
      candidatoNome: usuarios.nome, candidatoEmail: usuarios.email, candidatoTelefone: usuarios.telefone, etapa: candidaturas.etapa, vistaEm: candidaturas.vistaEm, perfilTitulo: perfis.titulo, perfilResumo: perfis.resumo,
      temCurriculo: sql<boolean>`${perfis.curriculo} is not null`, avisoEmpresaEm: candidaturas.avisoEmpresaEm, avisoCandidatoEm: candidaturas.avisoCandidatoEm,
    })
    .from(candidaturas)
    .innerJoin(vagas, eq(vagas.id, candidaturas.vagaId))
    .innerJoin(empresas, eq(empresas.id, vagas.empresaId))
    .innerJoin(usuarios, eq(usuarios.id, candidaturas.candidatoId))
    .leftJoin(perfis, eq(perfis.usuarioId, candidaturas.candidatoId))
    .where(eq(candidaturas.id, candidaturaId));
  if (!l) return null;
  if (l.donoId === usuarioId) return { ...l, temCurriculo: Boolean(l.temCurriculo), papel: 'empresa' };
  if (l.candidatoId === usuarioId) return { ...l, temCurriculo: Boolean(l.temCurriculo), papel: 'candidato' };
  return null;
}

const naoLidasSql = (papel: Papel, usuarioId: string) => {
  const lida = papel === 'empresa' ? candidaturas.lidaEmpresaEm : candidaturas.lidaCandidatoEm;
  return sql<number>`(select count(*)::int from ${mensagens} where ${mensagens.candidaturaId} = ${candidaturas.id} and ${mensagens.autorId} <> ${usuarioId} and (${lida} is null or ${mensagens.criadaEm} > ${lida}))`;
};

export async function candidaturasDaVaga(db: Banco, empresaId: string, vagaId: string, donoId: string) {
  return db
    .select({ id: candidaturas.id, candidatoId: candidaturas.candidatoId, etapa: candidaturas.etapa, criadaEm: candidaturas.criadaEm, vistaEm: candidaturas.vistaEm, nome: usuarios.nome, telefone: usuarios.telefone, email: usuarios.email, titulo: perfis.titulo, temCurriculo: sql<boolean>`${perfis.curriculo} is not null`, naoLidas: naoLidasSql('empresa', donoId), plus: sql<boolean>`coalesce(${assinaturas.plano} = 'plus' and ${assinaturas.fimEm} > now(), false)` })
    .from(candidaturas)
    .innerJoin(vagas, and(eq(vagas.id, candidaturas.vagaId), eq(vagas.empresaId, empresaId)))
    .innerJoin(usuarios, eq(usuarios.id, candidaturas.candidatoId))
    .leftJoin(perfis, eq(perfis.usuarioId, candidaturas.candidatoId))
    .leftJoin(assinaturas, eq(assinaturas.usuarioId, candidaturas.candidatoId))
    .where(eq(candidaturas.vagaId, vagaId))
    .orderBy(desc(sql`coalesce(${assinaturas.plano} = 'plus' and ${assinaturas.fimEm} > now(), false)`), desc(candidaturas.criadaEm));
}

export async function candidaturasDoCandidato(db: Banco, candidatoId: string) {
  return db
    .select({ id: candidaturas.id, etapa: candidaturas.etapa, criadaEm: candidaturas.criadaEm, vistaEm: candidaturas.vistaEm, vagaTitulo: vagas.titulo, vagaSlug: vagas.slug, empresa: empresas.nome, cidade: vagas.cidade, uf: vagas.uf, naoLidas: naoLidasSql('candidato', candidatoId) })
    .from(candidaturas)
    .innerJoin(vagas, eq(vagas.id, candidaturas.vagaId))
    .innerJoin(empresas, eq(empresas.id, vagas.empresaId))
    .where(eq(candidaturas.candidatoId, candidatoId))
    .orderBy(desc(candidaturas.criadaEm));
}

export async function mudarEtapa(db: Banco, candidaturaId: string, usuarioId: string, etapa: string): Promise<boolean> {
  if (!ETAPAS.some((e) => e.id === (etapa as Etapa))) return false;
  const a = await acessoCandidatura(db, candidaturaId, usuarioId);
  if (a?.papel !== 'empresa') return false;
  await db.update(candidaturas).set({ etapa }).where(eq(candidaturas.id, candidaturaId));
  return true;
}

export async function enviarMensagem(db: Banco, d: { candidaturaId: string; autorId: string; texto: string; agora?: Date }, enviar: EnviarEmail = enviarEmail): Promise<{ ok: true } | { ok: false; erro: string }> {
  const texto = d.texto.trim();
  if (!texto) return { ok: false, erro: 'Escreva uma mensagem.' };
  if (texto.length > MAX_MENSAGEM) return { ok: false, erro: `Use no máximo ${MAX_MENSAGEM} caracteres.` };
  const a = await acessoCandidatura(db, d.candidaturaId, d.autorId);
  if (!a) return { ok: false, erro: 'Conversa não encontrada.' };
  const agora = d.agora ?? new Date();
  await db.insert(mensagens).values({ candidaturaId: a.candidaturaId, autorId: d.autorId, texto, criadaEm: agora });

  const paraEmpresa = a.papel === 'candidato';
  const ultimoAviso = paraEmpresa ? a.avisoEmpresaEm : a.avisoCandidatoEm;
  const deveAvisar = !ultimoAviso || agora.getTime() - ultimoAviso.getTime() >= INTERVALO_AVISO_MS;
  await db.update(candidaturas).set({ ...(paraEmpresa ? { lidaCandidatoEm: agora } : { lidaEmpresaEm: agora }), ...(deveAvisar ? (paraEmpresa ? { avisoEmpresaEm: agora } : { avisoCandidatoEm: agora }) : {}) }).where(eq(candidaturas.id, a.candidaturaId));

  if (deveAvisar) {
    const [dono] = paraEmpresa ? await db.select({ email: usuarios.email }).from(usuarios).where(eq(usuarios.id, a.donoId)) : [{ email: a.candidatoEmail }];
    const quem = paraEmpresa ? a.candidatoNome : a.empresaNome;
    if (dono) await enviar(dono.email, `Nova mensagem de ${quem}`, `${quem} respondeu sobre a vaga ${a.vagaTitulo}.\n\nResponda em ${URL_SITE}/conversas/${a.candidaturaId}`);
  }
  return { ok: true };
}

export async function conversa(db: Banco, candidaturaId: string, usuarioId: string) {
  const a = await acessoCandidatura(db, candidaturaId, usuarioId);
  if (!a) return null;
  return db.select({ id: mensagens.id, texto: mensagens.texto, criadaEm: mensagens.criadaEm, autorId: mensagens.autorId }).from(mensagens).where(eq(mensagens.candidaturaId, candidaturaId)).orderBy(asc(mensagens.criadaEm));
}

export async function marcarLida(db: Banco, a: Acesso, agora = new Date()): Promise<void> {
  if (a.papel === 'empresa') {
    await db.update(candidaturas).set({ lidaEmpresaEm: agora, vistaEm: a.vistaEm ?? agora }).where(eq(candidaturas.id, a.candidaturaId));
  } else {
    await db.update(candidaturas).set({ lidaCandidatoEm: agora }).where(eq(candidaturas.id, a.candidaturaId));
  }
}

export async function naoLidas(db: Banco, usuarioId: string, papel: Papel): Promise<number> {
  const lida = papel === 'empresa' ? candidaturas.lidaEmpresaEm : candidaturas.lidaCandidatoEm;
  const quem = papel === 'empresa' ? eq(empresas.donoId, usuarioId) : eq(candidaturas.candidatoId, usuarioId);
  const [r] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(mensagens)
    .innerJoin(candidaturas, eq(candidaturas.id, mensagens.candidaturaId))
    .innerJoin(vagas, eq(vagas.id, candidaturas.vagaId))
    .innerJoin(empresas, eq(empresas.id, vagas.empresaId))
    .where(and(quem, sql`${mensagens.autorId} <> ${usuarioId}`, or(isNull(lida), gt(mensagens.criadaEm, sql`${lida}`))));
  return r?.total ?? 0;
}

export type ItemConversa = {
  id: string;
  vagaTitulo: string;
  etapa: string;
  nome: string;
  /** Logo da empresa (para o candidato) ou foto do candidato (para a empresa). */
  imagem: string | null;
  ultimaTexto: string | null;
  ultimaEm: Date;
  minha: boolean;
  naoLidas: number;
};

// Caixa de entrada: uma linha por candidatura, a conversa mais recente primeiro.
export async function caixaDeEntrada(db: Banco, usuarioId: string, papel: Papel, limite = 200): Promise<ItemConversa[]> {
  const ultima = sql<Date>`coalesce((select max(${mensagens.criadaEm}) from ${mensagens} where ${mensagens.candidaturaId} = ${candidaturas.id}), ${candidaturas.criadaEm})`.mapWith(candidaturas.criadaEm);
  const linhas = await db
    .select({
      id: candidaturas.id,
      etapa: candidaturas.etapa,
      vagaTitulo: vagas.titulo,
      empresaId: empresas.id,
      empresaNome: empresas.nome,
      temLogo: sql<boolean>`${empresas.logo} is not null`,
      candidatoId: candidaturas.candidatoId,
      candidatoNome: usuarios.nome,
      temFoto: sql<boolean>`coalesce(${perfis.foto} is not null, false)`,
      ultimaTexto: sql<string | null>`(select ${mensagens.texto} from ${mensagens} where ${mensagens.candidaturaId} = ${candidaturas.id} order by ${mensagens.criadaEm} desc limit 1)`,
      ultimoAutor: sql<string | null>`(select ${mensagens.autorId}::text from ${mensagens} where ${mensagens.candidaturaId} = ${candidaturas.id} order by ${mensagens.criadaEm} desc limit 1)`,
      ultimaEm: ultima,
      naoLidas: naoLidasSql(papel, usuarioId),
    })
    .from(candidaturas)
    .innerJoin(vagas, eq(vagas.id, candidaturas.vagaId))
    .innerJoin(empresas, eq(empresas.id, vagas.empresaId))
    .innerJoin(usuarios, eq(usuarios.id, candidaturas.candidatoId))
    .leftJoin(perfis, eq(perfis.usuarioId, candidaturas.candidatoId))
    .where(papel === 'empresa' ? eq(empresas.donoId, usuarioId) : eq(candidaturas.candidatoId, usuarioId))
    .orderBy(desc(ultima))
    .limit(limite);
  return linhas.map((l) => ({
    id: l.id,
    vagaTitulo: l.vagaTitulo,
    etapa: l.etapa,
    nome: papel === 'empresa' ? l.candidatoNome : l.empresaNome,
    imagem: papel === 'empresa' ? (l.temFoto ? `/api/foto/${l.candidatoId}` : null) : l.temLogo ? `/api/logo/${l.empresaId}` : null,
    ultimaTexto: l.ultimaTexto,
    ultimaEm: new Date(l.ultimaEm),
    minha: l.ultimoAutor === usuarioId,
    naoLidas: Number(l.naoLidas) || 0,
  }));
}
