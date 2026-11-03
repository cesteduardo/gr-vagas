import { randomBytes } from 'node:crypto';
import { and, count, desc, eq, gt, isNotNull, sql } from 'drizzle-orm';
import { abrirSessao } from '@/lib/auth/contas';
import { cidadePorSlug, VALIDADE_VAGA_DIAS } from '@/lib/config';
import type { Banco } from '@/lib/db/client';
import { candidaturas, denuncias, empresas, usuarios, vagas, type ConfigArte } from '@/lib/db/schema';
import type { DadosVaga } from '@/lib/forms/vaga';
import { arteValida, limites, planoDe } from '@/lib/planos';
import { normalizar, paraSlug } from '@/lib/texto';
import { beneficiosDoTexto, nomeDaTag } from '@/lib/tags';

const DIA_MS = 24 * 60 * 60 * 1000;
const sufixo = () => randomBytes(3).toString('hex');
export const POR_PAGINA = 20;

type Tx = Parameters<Parameters<Banco['transaction']>[0]>[0];

const camposBusca = (d: DadosVaga, cidade: string, empresa: string) => normalizar([d.titulo, d.area, d.contrato, d.modalidade, cidade, empresa, d.descricao, d.requisitos, ...(d.tags ?? []).map((t) => nomeDaTag(t) ?? ''), ...beneficiosDoTexto(d.beneficios)].join(' '));

async function inserirVaga(tx: Banco | Tx, empresaId: string, empresaNome: string, d: DadosVaga, arte: ConfigArte) {
  const c = cidadePorSlug(d.cidadeSlug);
  if (!c) throw new Error('Cidade fora da lista.');
  const [v] = await tx
    .insert(vagas)
    .values({
      empresaId,
      slug: `${paraSlug(d.titulo) || 'vaga'}-${sufixo()}`,
      titulo: d.titulo,
      area: d.area,
      contrato: d.contrato,
      modalidade: d.modalidade,
      cidadeSlug: c.slug,
      cidade: c.nome,
      uf: c.uf,
      pais: c.pais,
      salarioCentavos: d.salarioCentavos,
      descricao: d.descricao,
      requisitos: d.requisitos,
      beneficios: d.beneficios,
      tags: d.tags ?? [],
      busca: camposBusca(d, c.nome, empresaNome),
      arte,
      expiraEm: new Date(Date.now() + VALIDADE_VAGA_DIAS * DIA_MS),
    })
    .returning({ id: vagas.id, slug: vagas.slug });
  return v!;
}

export async function publicarSemConta(
  db: Banco,
  d: { nome: string; email: string; telefone: string; empresa: string; vaga: DadosVaga; arte?: Partial<ConfigArte> },
): Promise<{ ok: true; sessao: string; vagaId: string; slug: string } | { ok: false; contaExistente: true }> {
  const r = await db.transaction(async (tx) => {
    const [u] = await tx.insert(usuarios).values({ nome: d.nome, email: d.email, telefone: d.telefone, tipo: 'contratante' }).onConflictDoNothing().returning({ id: usuarios.id });
    if (!u) return null;
    const [e] = await tx.insert(empresas).values({ donoId: u.id, nome: d.empresa, slug: `${paraSlug(d.empresa) || 'empresa'}-${sufixo()}` }).returning({ id: empresas.id });
    const v = await inserirVaga(tx, e!.id, d.empresa, d.vaga, arteValida(d.arte));
    return { usuarioId: u.id, ...v };
  });
  if (!r) return { ok: false, contaExistente: true };
  return { ok: true, sessao: await abrirSessao(db, r.usuarioId), vagaId: r.id, slug: r.slug };
}

const abertasAgora = (empresaId: string, agora: Date) => and(eq(vagas.empresaId, empresaId), eq(vagas.estado, 'aberta'), gt(vagas.expiraEm, agora));

async function contarAbertas(db: Banco, empresaId: string, agora = new Date()) {
  const [r] = await db.select({ total: count() }).from(vagas).where(abertasAgora(empresaId, agora));
  return r?.total ?? 0;
}

const avisoLimite = (n: number) => `Seu plano permite ${n} ${n === 1 ? 'vaga aberta' : 'vagas abertas'} por vez. Encerre uma vaga ou mude de plano.`;

export async function publicarVaga(db: Banco, usuarioId: string, empresaId: string, d: DadosVaga, arte?: Partial<ConfigArte>): Promise<{ ok: true; vagaId: string; slug: string } | { ok: false; erro: string }> {
  const lim = limites(await planoDe(db, usuarioId));
  if ((await contarAbertas(db, empresaId)) >= lim.vagasAbertas) return { ok: false, erro: avisoLimite(lim.vagasAbertas) };
  const [e] = await db.select({ nome: empresas.nome }).from(empresas).where(eq(empresas.id, empresaId));
  if (!e) return { ok: false, erro: 'Empresa não encontrada.' };
  const v = await inserirVaga(db, empresaId, e.nome, d, arteValida(arte));
  return { ok: true, vagaId: v.id, slug: v.slug };
}

export async function editarVaga(db: Banco, empresaId: string, vagaId: string, d: DadosVaga): Promise<boolean> {
  const c = cidadePorSlug(d.cidadeSlug);
  const [e] = await db.select({ nome: empresas.nome }).from(empresas).where(eq(empresas.id, empresaId));
  if (!c || !e) return false;
  const r = await db
    .update(vagas)
    .set({ titulo: d.titulo, area: d.area, contrato: d.contrato, modalidade: d.modalidade, cidadeSlug: c.slug, cidade: c.nome, uf: c.uf, pais: c.pais, salarioCentavos: d.salarioCentavos, descricao: d.descricao, requisitos: d.requisitos, beneficios: d.beneficios, tags: d.tags ?? [], busca: camposBusca(d, c.nome, e.nome) })
    .where(and(eq(vagas.id, vagaId), eq(vagas.empresaId, empresaId)))
    .returning({ id: vagas.id });
  return r.length > 0;
}

export async function salvarArte(db: Banco, empresaId: string, vagaId: string, pedido: Partial<ConfigArte>): Promise<ConfigArte | null> {
  const arte = arteValida(pedido);
  const r = await db.update(vagas).set({ arte }).where(and(eq(vagas.id, vagaId), eq(vagas.empresaId, empresaId))).returning({ id: vagas.id });
  return r.length ? arte : null;
}

// Reabrir ou renovar conta como publicar: respeita o limite do plano.
export async function mudarEstadoVaga(db: Banco, usuarioId: string, empresaId: string, vagaId: string, estado: 'aberta' | 'pausada' | 'encerrada'): Promise<{ ok: boolean; erro?: string }> {
  const [v] = await db.select().from(vagas).where(and(eq(vagas.id, vagaId), eq(vagas.empresaId, empresaId)));
  if (!v) return { ok: false, erro: 'Vaga não encontrada.' };
  const agora = new Date();
  const jaAbertaValendo = v.estado === 'aberta' && v.expiraEm > agora;
  if (estado === 'aberta' && !jaAbertaValendo) {
    const lim = limites(await planoDe(db, usuarioId));
    if ((await contarAbertas(db, empresaId, agora)) >= lim.vagasAbertas) return { ok: false, erro: avisoLimite(lim.vagasAbertas) };
    await db.update(vagas).set({ estado, expiraEm: new Date(agora.getTime() + VALIDADE_VAGA_DIAS * DIA_MS) }).where(eq(vagas.id, vagaId));
    return { ok: true };
  }
  await db.update(vagas).set({ estado, destaque: estado === 'aberta' ? v.destaque : false }).where(eq(vagas.id, vagaId));
  return { ok: true };
}

export async function alternarDestaque(db: Banco, usuarioId: string, empresaId: string, vagaId: string): Promise<{ ok: boolean; erro?: string }> {
  const [v] = await db.select().from(vagas).where(and(eq(vagas.id, vagaId), eq(vagas.empresaId, empresaId)));
  if (!v) return { ok: false, erro: 'Vaga não encontrada.' };
  if (!v.destaque) {
    const lim = limites(await planoDe(db, usuarioId));
    const [r] = await db.select({ total: count() }).from(vagas).where(and(abertasAgora(empresaId, new Date()), eq(vagas.destaque, true)));
    if ((r?.total ?? 0) >= lim.destaques) return { ok: false, erro: lim.destaques ? `Seu plano permite ${lim.destaques} em destaque.` : 'O destaque faz parte dos planos pagos.' };
  }
  await db.update(vagas).set({ destaque: !v.destaque }).where(eq(vagas.id, vagaId));
  return { ok: true };
}

export type VagaPublica = NonNullable<Awaited<ReturnType<typeof vagaPublica>>>;

const colunasVaga = {
  id: vagas.id, slug: vagas.slug, titulo: vagas.titulo, area: vagas.area, contrato: vagas.contrato, modalidade: vagas.modalidade, cidadeSlug: vagas.cidadeSlug, cidade: vagas.cidade, uf: vagas.uf, pais: vagas.pais, moeda: vagas.moeda,
  salarioCentavos: vagas.salarioCentavos, descricao: vagas.descricao, requisitos: vagas.requisitos, beneficios: vagas.beneficios, tags: vagas.tags, estado: vagas.estado, destaque: vagas.destaque, arte: vagas.arte, publicadaEm: vagas.publicadaEm, expiraEm: vagas.expiraEm,
  temImagem: sql<boolean>`${vagas.imagem} is not null`, empresaId: empresas.id, empresaNome: empresas.nome, empresaSlug: empresas.slug, empresaDescricao: empresas.descricao, temLogo: sql<boolean>`${empresas.logo} is not null`, verificada: sql<boolean>`${usuarios.emailConfirmadoEm} is not null`,
};

export async function vagaPublica(db: Banco, slug: string) {
  const [v] = await db.select(colunasVaga).from(vagas).innerJoin(empresas, eq(empresas.id, vagas.empresaId)).innerJoin(usuarios, eq(usuarios.id, empresas.donoId)).where(eq(vagas.slug, slug));
  return v ?? null;
}

export async function vagaDaEmpresa(db: Banco, empresaId: string, vagaId: string) {
  const [v] = await db.select(colunasVaga).from(vagas).innerJoin(empresas, eq(empresas.id, vagas.empresaId)).innerJoin(usuarios, eq(usuarios.id, empresas.donoId)).where(and(eq(vagas.id, vagaId), eq(vagas.empresaId, empresaId)));
  return v ?? null;
}

export const vagaAceitaCandidatura = (v: { estado: string; expiraEm: Date }, agora = new Date()) => v.estado === 'aberta' && v.expiraEm > agora;

export type Filtros = { q?: string; cidade?: string; contrato?: string; modalidade?: string; area?: string; tag?: string; empresaId?: string; pagina?: number };

const escaparLike = (t: string) => t.replace(/[\\%_]/g, '\\$&');

export function condicoesBusca(f: Filtros, agora = new Date()) {
  const termos = normalizar(f.q ?? '').split(/\s+/).filter((t) => t.length > 1).slice(0, 8);
  return and(
    eq(vagas.estado, 'aberta'),
    gt(vagas.expiraEm, agora),
    isNotNull(usuarios.emailConfirmadoEm),
    ...termos.map((t) => sql`${vagas.busca} like ${`%${escaparLike(t)}%`}`),
    f.cidade ? eq(vagas.cidadeSlug, f.cidade) : undefined,
    f.contrato ? eq(vagas.contrato, f.contrato) : undefined,
    f.modalidade ? eq(vagas.modalidade, f.modalidade) : undefined,
    f.area ? eq(vagas.area, f.area) : undefined,
    f.tag ? sql`${vagas.tags} @> ${JSON.stringify([f.tag])}::jsonb` : undefined,
    f.empresaId ? eq(vagas.empresaId, f.empresaId) : undefined,
  );
}

export async function buscarVagas(db: Banco, f: Filtros = {}) {
  const pagina = Math.max(1, Math.floor(f.pagina ?? 1));
  const onde = condicoesBusca(f);
  const base = () => db.select(colunasVaga).from(vagas).innerJoin(empresas, eq(empresas.id, vagas.empresaId)).innerJoin(usuarios, eq(usuarios.id, empresas.donoId));
  const itens = await base().where(onde).orderBy(desc(vagas.destaque), desc(vagas.publicadaEm)).limit(POR_PAGINA).offset((pagina - 1) * POR_PAGINA);
  const [t] = await db.select({ total: count() }).from(vagas).innerJoin(empresas, eq(empresas.id, vagas.empresaId)).innerJoin(usuarios, eq(usuarios.id, empresas.donoId)).where(onde);
  return { itens, total: t?.total ?? 0, pagina };
}

export async function vagasParecidas(db: Banco, v: { id: string; area: string; cidadeSlug: string }) {
  const { itens } = await buscarVagas(db, { area: v.area, cidade: v.cidadeSlug });
  return itens.filter((i) => i.id !== v.id).slice(0, 3);
}

export async function vagasDaEmpresa(db: Banco, empresaId: string) {
  return db
    .select({ id: vagas.id, slug: vagas.slug, titulo: vagas.titulo, estado: vagas.estado, destaque: vagas.destaque, expiraEm: vagas.expiraEm, cidade: vagas.cidade, publicadaEm: vagas.publicadaEm, candidatos: sql<number>`(select count(*)::int from ${candidaturas} where ${candidaturas.vagaId} = ${vagas.id})` })
    .from(vagas)
    .where(eq(vagas.empresaId, empresaId))
    .orderBy(desc(vagas.publicadaEm));
}

export async function denunciar(db: Banco, vagaId: string, motivo: string, chaveOrigem: string): Promise<boolean> {
  const { dentroDoLimite } = await import('@/lib/auth/contas');
  if (!(await dentroDoLimite(db, `denuncia:${chaveOrigem}`, 5, 60 * 60 * 1000))) return false;
  await db.insert(denuncias).values({ vagaId, motivo: motivo.trim().slice(0, 1000) });
  return true;
}

export async function denunciasAbertas(db: Banco) {
  return db
    .select({ id: denuncias.id, motivo: denuncias.motivo, criadaEm: denuncias.criadaEm, vagaId: vagas.id, titulo: vagas.titulo, slug: vagas.slug, estadoVaga: vagas.estado, empresa: empresas.nome })
    .from(denuncias)
    .innerJoin(vagas, eq(vagas.id, denuncias.vagaId))
    .innerJoin(empresas, eq(empresas.id, vagas.empresaId))
    .where(eq(denuncias.estado, 'aberta'))
    .orderBy(desc(denuncias.criadaEm));
}

export async function resolverDenuncia(db: Banco, id: string, encerrar: boolean): Promise<void> {
  const [d] = await db.update(denuncias).set({ estado: 'resolvida' }).where(eq(denuncias.id, id)).returning({ vagaId: denuncias.vagaId });
  if (d && encerrar) await db.update(vagas).set({ estado: 'encerrada', destaque: false }).where(eq(vagas.id, d.vagaId));
}

export const rotuloEstado = (estado: string, expiraEm: Date, agora = new Date()) => (estado === 'encerrada' ? 'Encerrada' : estado === 'pausada' ? 'Pausada' : expiraEm <= agora ? 'Vencida' : 'Aberta');

export async function guardarImagemVaga(db: Banco, empresaId: string, vagaId: string, imagem: Buffer | null, mime: string | null): Promise<boolean> {
  const r = await db.update(vagas).set({ imagem, imagemMime: mime }).where(and(eq(vagas.id, vagaId), eq(vagas.empresaId, empresaId))).returning({ id: vagas.id });
  return r.length > 0;
}

// Empresas com vaga aberta, para o letreiro da página inicial. Quem paga vem primeiro.
export async function empresasDoLetreiro(db: Banco, agora = new Date()) {
  return db
    .select({ id: empresas.id, nome: empresas.nome, slug: empresas.slug, temLogo: sql<boolean>`${empresas.logo} is not null`, vagas: sql<number>`count(${vagas.id})::int` })
    .from(empresas)
    .innerJoin(usuarios, eq(usuarios.id, empresas.donoId))
    .innerJoin(vagas, and(eq(vagas.empresaId, empresas.id), eq(vagas.estado, 'aberta'), gt(vagas.expiraEm, agora)))
    .where(isNotNull(usuarios.emailConfirmadoEm))
    .groupBy(empresas.id)
    .orderBy(desc(sql`count(${vagas.id})`))
    .limit(40);
}

const PALAVRAS_VAZIAS = new Set(['de', 'da', 'do', 'das', 'dos', 'em', 'e', 'a', 'o', 'com', 'para', 'por', 'um', 'uma', 'na', 'no', 'anos', 'experiencia', 'trabalho', 'empresa', 'sao', 'jose', 'rio', 'preto']);
const palavras = (t: string) => normalizar(t).split(/[^a-z0-9]+/).filter((p) => p.length > 2 && !PALAVRAS_VAZIAS.has(p));

// Ordena as vagas abertas pelo quanto combinam com o currículo. Compara palavras
// inteiras: "rio" não pode combinar com "estagiário".
export async function vagasQueCombinam(db: Banco, d: { titulo?: string; texto: string; cidadeSlug?: string }, quantas = 6) {
  const doTitulo = new Set(palavras(d.titulo ?? ''));
  const doTexto = new Set(palavras(d.texto));
  const { itens } = await buscarVagas(db, {});
  const pontuadas = itens.map((v) => {
    const noTitulo = new Set(palavras(v.titulo));
    const noResto = new Set(palavras(`${v.area} ${v.descricao} ${v.requisitos}`));
    let pontos = d.cidadeSlug && v.cidadeSlug === d.cidadeSlug ? 2 : 0;
    for (const p of noTitulo) pontos += doTitulo.has(p) ? 20 : doTexto.has(p) ? 8 : 0;
    for (const p of noResto) pontos += doTitulo.has(p) ? 3 : doTexto.has(p) ? 1 : 0;
    return { v, pontos };
  });
  return pontuadas.sort((a, b) => b.pontos - a.pontos).slice(0, quantas).map((p) => p.v);
}
