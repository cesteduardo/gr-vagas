import { and, desc, eq, isNotNull, sql } from 'drizzle-orm';
import { cidadePorSlug, URL_SITE } from '@/lib/config';
import { acessoCandidatura } from '@/lib/candidaturas';
import type { Banco } from '@/lib/db/client';
import { alertas, alertasEnviados, assinaturas, candidaturas, empresas, mensagens, perfis, salvas, usuarios, vagas } from '@/lib/db/schema';
import { enviarEmail, type EnviarEmail } from '@/lib/email';
import { limites, planoDe } from '@/lib/planos';
import { normalizar } from '@/lib/texto';
import { cvValido, type Cv } from '@/lib/curriculo';
import { buscarVagas } from '@/lib/vagas';

export const MAX_CURRICULO = 3 * 1024 * 1024;
const DIA_MS = 24 * 60 * 60 * 1000;

export async function perfilDe(db: Banco, usuarioId: string) {
  const [p] = await db.select({ titulo: perfis.titulo, cidadeSlug: perfis.cidadeSlug, resumo: perfis.resumo, curriculoNome: perfis.curriculoNome, aceiteTalentosEm: perfis.aceiteTalentosEm, cv: perfis.cv }).from(perfis).where(eq(perfis.usuarioId, usuarioId));
  return p ?? { titulo: '', cidadeSlug: '', resumo: '', curriculoNome: null, aceiteTalentosEm: null, cv: {} as Cv };
}

export async function salvarPerfil(db: Banco, usuarioId: string, d: { titulo: string; cidadeSlug: string; resumo: string; aceiteTalentos: boolean; cv?: Cv }) {
  const aceite = d.aceiteTalentos ? new Date() : null;
  const valores = { titulo: d.titulo.trim(), cidadeSlug: d.cidadeSlug, resumo: d.resumo.trim(), atualizadoEm: new Date(), ...(d.cv ? { cv: cvValido(d.cv) } : {}) };
  await db
    .insert(perfis)
    .values({ usuarioId, ...valores, aceiteTalentosEm: aceite })
    .onConflictDoUpdate({ target: perfis.usuarioId, set: { ...valores, aceiteTalentosEm: d.aceiteTalentos ? sql`coalesce(${perfis.aceiteTalentosEm}, now())` : null } });
}

export function validarPdf(b: Buffer): string | null {
  if (b.length > MAX_CURRICULO) return 'O arquivo passa de 3 MB.';
  if (b.subarray(0, 4).toString('latin1') !== '%PDF') return 'Envie o currículo em PDF.';
  return null;
}

export async function guardarCurriculo(db: Banco, usuarioId: string, nome: string, b: Buffer): Promise<string | null> {
  const erro = validarPdf(b);
  if (erro) return erro;
  const curriculoNome = nome.replace(/[^\p{L}\p{N} ._-]/gu, '').slice(0, 100) || 'curriculo.pdf';
  await db.insert(perfis).values({ usuarioId, curriculo: b, curriculoNome }).onConflictDoUpdate({ target: perfis.usuarioId, set: { curriculo: b, curriculoNome, atualizadoEm: new Date() } });
  return null;
}

// Só o próprio candidato, quem recebeu candidatura dele, ou assinante com acesso ao
// banco de talentos quando o candidato aceitou aparecer.
export async function curriculoParaBaixar(db: Banco, solicitanteId: string, candidatoId: string, candidaturaId?: string) {
  let pode = solicitanteId === candidatoId;
  if (!pode && candidaturaId) {
    const a = await acessoCandidatura(db, candidaturaId, solicitanteId);
    pode = a?.papel === 'empresa' && a.candidatoId === candidatoId;
  }
  const [p] = await db.select({ curriculo: perfis.curriculo, nome: perfis.curriculoNome, aceite: perfis.aceiteTalentosEm }).from(perfis).where(eq(perfis.usuarioId, candidatoId));
  if (!p?.curriculo) return null;
  if (!pode && p.aceite && limites(await planoDe(db, solicitanteId)).talentos) pode = true;
  return pode ? { arquivo: p.curriculo, nome: p.nome ?? 'curriculo.pdf' } : null;
}

export async function alternarSalva(db: Banco, usuarioId: string, vagaId: string): Promise<boolean> {
  const apagada = await db.delete(salvas).where(and(eq(salvas.usuarioId, usuarioId), eq(salvas.vagaId, vagaId))).returning({ v: salvas.vagaId });
  if (apagada.length) return false;
  await db.insert(salvas).values({ usuarioId, vagaId }).onConflictDoNothing();
  return true;
}

export async function estaSalva(db: Banco, usuarioId: string, vagaId: string) {
  const [s] = await db.select({ v: salvas.vagaId }).from(salvas).where(and(eq(salvas.usuarioId, usuarioId), eq(salvas.vagaId, vagaId)));
  return Boolean(s);
}

export async function vagasSalvas(db: Banco, usuarioId: string) {
  return db
    .select({ slug: vagas.slug, titulo: vagas.titulo, empresa: empresas.nome, cidade: vagas.cidade, uf: vagas.uf, contrato: vagas.contrato, id: vagas.id, estado: vagas.estado, expiraEm: vagas.expiraEm })
    .from(salvas)
    .innerJoin(vagas, eq(vagas.id, salvas.vagaId))
    .innerJoin(empresas, eq(empresas.id, vagas.empresaId))
    .where(eq(salvas.usuarioId, usuarioId))
    .orderBy(desc(salvas.criadaEm));
}

export async function criarAlerta(db: Banco, usuarioId: string, termo: string, cidadeSlug: string): Promise<string | null> {
  if (termo.trim().length < 2) return 'Escreva o cargo ou a palavra que você procura.';
  if (!cidadePorSlug(cidadeSlug)) return 'Escolha a cidade.';
  await db.insert(alertas).values({ usuarioId, termo: termo.trim().slice(0, 80), cidadeSlug });
  return null;
}

export const alertasDe = (db: Banco, usuarioId: string) => db.select().from(alertas).where(eq(alertas.usuarioId, usuarioId)).orderBy(desc(alertas.criadoEm));

export async function apagarAlerta(db: Banco, usuarioId: string, id: string) {
  await db.delete(alertas).where(and(eq(alertas.id, id), eq(alertas.usuarioId, usuarioId)));
}

export async function enviarAlertas(db: Banco, agora = new Date(), enviar: EnviarEmail = enviarEmail): Promise<number> {
  const todos = await db.select({ alerta: alertas, email: usuarios.email }).from(alertas).innerJoin(usuarios, eq(usuarios.id, alertas.usuarioId));
  let enviados = 0;
  for (const { alerta, email } of todos) {
    const imediato = limites(await planoDe(db, alerta.usuarioId, agora)).alertaImediato;
    if (!imediato && alerta.ultimoEnvioEm && agora.getTime() - alerta.ultimoEnvioEm.getTime() < DIA_MS) continue;
    const ja = (await db.select({ v: alertasEnviados.vagaId }).from(alertasEnviados).where(eq(alertasEnviados.alertaId, alerta.id))).map((l) => l.v);
    const { itens } = await buscarVagas(db, { q: alerta.termo, cidade: alerta.cidadeSlug });
    const novas = itens.filter((v) => !ja.includes(v.id));
    if (!novas.length) continue;
    const corpo = novas.map((v) => `${v.titulo}, ${v.empresaNome}\n${URL_SITE}/vagas/${v.slug}`).join('\n\n');
    if (!(await enviar(email, `Novas vagas para ${alerta.termo}`, corpo))) continue;
    await db.insert(alertasEnviados).values(novas.map((v) => ({ alertaId: alerta.id, vagaId: v.id }))).onConflictDoNothing();
    await db.update(alertas).set({ ultimoEnvioEm: agora }).where(eq(alertas.id, alerta.id));
    enviados += 1;
  }
  return enviados;
}

export async function buscarTalentos(db: Banco, f: { q?: string; cidade?: string }) {
  const lista = await db
    .select({ id: usuarios.id, nome: usuarios.nome, email: usuarios.email, telefone: usuarios.telefone, titulo: perfis.titulo, resumo: perfis.resumo, cidadeSlug: perfis.cidadeSlug, temCurriculo: sql<boolean>`${perfis.curriculo} is not null`, plus: sql<boolean>`coalesce(${assinaturas.plano} = 'plus' and ${assinaturas.fimEm} > now(), false)` })
    .from(perfis)
    .innerJoin(usuarios, eq(usuarios.id, perfis.usuarioId))
    .leftJoin(assinaturas, eq(assinaturas.usuarioId, perfis.usuarioId))
    .where(and(isNotNull(perfis.aceiteTalentosEm), f.cidade ? eq(perfis.cidadeSlug, f.cidade) : undefined))
    .limit(200);
  const termos = normalizar(f.q ?? '').split(/\s+/).filter(Boolean);
  return lista
    .filter((l) => {
      const t = normalizar(`${l.titulo} ${l.resumo}`);
      return termos.every((x) => t.includes(x));
    })
    .sort((a, b) => Number(b.plus) - Number(a.plus));
}

export async function dadosDoUsuario(db: Banco, usuarioId: string) {
  const [u] = await db.select({ nome: usuarios.nome, email: usuarios.email, telefone: usuarios.telefone, tipo: usuarios.tipo, criadoEm: usuarios.criadoEm }).from(usuarios).where(eq(usuarios.id, usuarioId));
  const perfil = await perfilDe(db, usuarioId);
  const lista = await db.select({ vaga: vagas.titulo, etapa: candidaturas.etapa, criadaEm: candidaturas.criadaEm }).from(candidaturas).innerJoin(vagas, eq(vagas.id, candidaturas.vagaId)).where(eq(candidaturas.candidatoId, usuarioId));
  const escritas = await db.select({ texto: mensagens.texto, criadaEm: mensagens.criadaEm }).from(mensagens).where(eq(mensagens.autorId, usuarioId));
  return { conta: u, perfil, candidaturas: lista, mensagens: escritas, alertas: await alertasDe(db, usuarioId) };
}

// Apaga em cascata: perfil, currículo, candidaturas, mensagens, alertas, empresa e vagas.
export async function excluirConta(db: Banco, usuarioId: string): Promise<void> {
  await db.delete(usuarios).where(eq(usuarios.id, usuarioId));
}


const VAZIAS = new Set(['de', 'da', 'do', 'das', 'dos', 'em', 'com', 'para', 'por', 'uma', 'como', 'vaga', 'sobre', 'anos', 'experiencia', 'trabalho']);
const palavrasDe = (t: string) => new Set(normalizar(t).split(/[^a-z0-9]+/).filter((p) => p.length > 2 && !VAZIAS.has(p)));

// Extra do Plus: quanto do que a vaga pede aparece no perfil.
export function compatibilidade(perfil: { titulo: string; resumo: string }, vaga: { titulo: string; requisitos: string; area: string }): { porcentagem: number; emComum: string[] } | null {
  const doPerfil = palavrasDe(`${perfil.titulo} ${perfil.resumo}`);
  if (!doPerfil.size) return null;
  const titulo = [...palavrasDe(vaga.titulo)];
  const resto = [...palavrasDe(`${vaga.requisitos} ${vaga.area}`)].filter((p) => !titulo.includes(p));
  const noTitulo = titulo.filter((p) => doPerfil.has(p));
  const noResto = resto.filter((p) => doPerfil.has(p));
  const parteTitulo = titulo.length ? noTitulo.length / titulo.length : 0;
  const parteResto = resto.length ? noResto.length / resto.length : 0;
  return { porcentagem: Math.round((parteTitulo * 0.7 + parteResto * 0.3) * 100), emComum: [...noTitulo, ...noResto].slice(0, 6) };
}

// Extra do Plus: primeira mensagem pronta, com os dados reais da pessoa e da vaga.
export function apresentacao(d: { nome: string; titulo: string; resumo: string; vaga: string; empresa: string }): string {
  const frase = d.resumo.split(/(?<=[.!?])\s+/)[0]?.trim() ?? '';
  return [`Olá! Sou ${d.nome.split(' ')[0]}${d.titulo ? `, ${d.titulo.toLowerCase()}` : ''}, e tenho interesse na vaga de ${d.vaga} na ${d.empresa}.`, frase, 'Tenho disponibilidade para conversar e posso enviar mais informações. Obrigado!'].filter(Boolean).join(' ');
}
