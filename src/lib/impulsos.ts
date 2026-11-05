import { and, desc, eq, gt } from 'drizzle-orm';
import { IMPULSOS, URL_SITE } from '@/lib/config';
import type { Banco } from '@/lib/db/client';
import { empresas, pedidosImpulso, vagas } from '@/lib/db/schema';
import { enviarEmail, type EnviarEmail } from '@/lib/email';

// Impulso de vaga: a empresa pede pela vaga, paga por Pix e o administrador põe no ar.
// Enquanto vale, a vaga aparece na tela inicial. Um pedido aberto por vaga.

const DIA_MS = 24 * 60 * 60 * 1000;
export const precoDoImpulso = (dias: number) => IMPULSOS.find((i) => i.dias === dias)?.preco ?? null;

const admins = () => (process.env.ADMIN_EMAILS ?? '').split(',').map((e) => e.trim()).filter(Boolean);

export async function situacaoDoImpulso(db: Banco, vagaId: string, agora = new Date()) {
  const [v] = await db.select({ ate: vagas.impulsoAte }).from(vagas).where(eq(vagas.id, vagaId));
  const [pedido] = await db
    .select({ id: pedidosImpulso.id, dias: pedidosImpulso.dias, valorCentavos: pedidosImpulso.valorCentavos, criadoEm: pedidosImpulso.criadoEm })
    .from(pedidosImpulso)
    .where(and(eq(pedidosImpulso.vagaId, vagaId), eq(pedidosImpulso.estado, 'aberto')))
    .orderBy(desc(pedidosImpulso.criadoEm))
    .limit(1);
  return { noArAte: v?.ate && v.ate > agora ? v.ate : null, pedido: pedido ?? null };
}

export async function pedirImpulso(db: Banco, empresaId: string, vagaId: string, dias: number, enviar: EnviarEmail = enviarEmail): Promise<{ ok: true } | { ok: false; erro: string }> {
  const preco = precoDoImpulso(dias);
  if (preco === null) return { ok: false, erro: 'Escolha um dos prazos.' };
  const [v] = await db.select({ titulo: vagas.titulo, estado: vagas.estado, expiraEm: vagas.expiraEm, empresa: empresas.nome }).from(vagas).innerJoin(empresas, eq(empresas.id, vagas.empresaId)).where(and(eq(vagas.id, vagaId), eq(vagas.empresaId, empresaId)));
  if (!v) return { ok: false, erro: 'Vaga não encontrada.' };
  if (v.estado !== 'aberta' || v.expiraEm <= new Date()) return { ok: false, erro: 'Só dá para impulsionar uma vaga aberta.' };
  const { pedido } = await situacaoDoImpulso(db, vagaId);
  if (pedido) return { ok: false, erro: 'Já existe um pedido de impulso esperando o pagamento.' };
  await db.insert(pedidosImpulso).values({ vagaId, empresaId, dias, valorCentavos: Math.round(preco * 100) });
  for (const email of admins()) await enviar(email, `Pedido de impulso: ${v.titulo}`, `${v.empresa} pediu ${dias} dias de impulso para a vaga ${v.titulo}.\n\nPonha no ar depois de receber o pagamento: ${URL_SITE}/admin/impulsos`);
  return { ok: true };
}

export async function cancelarPedidoImpulso(db: Banco, empresaId: string, pedidoId: string) {
  await db.delete(pedidosImpulso).where(and(eq(pedidosImpulso.id, pedidoId), eq(pedidosImpulso.empresaId, empresaId), eq(pedidosImpulso.estado, 'aberto')));
}

export async function pedidosAbertos(db: Banco) {
  return db
    .select({ id: pedidosImpulso.id, dias: pedidosImpulso.dias, valorCentavos: pedidosImpulso.valorCentavos, criadoEm: pedidosImpulso.criadoEm, vagaTitulo: vagas.titulo, vagaSlug: vagas.slug, empresa: empresas.nome, impulsoAte: vagas.impulsoAte })
    .from(pedidosImpulso)
    .innerJoin(vagas, eq(vagas.id, pedidosImpulso.vagaId))
    .innerJoin(empresas, eq(empresas.id, pedidosImpulso.empresaId))
    .where(eq(pedidosImpulso.estado, 'aberto'))
    .orderBy(pedidosImpulso.criadoEm);
}

export async function vagasImpulsionadas(db: Banco, agora = new Date()) {
  return db
    .select({ id: vagas.id, titulo: vagas.titulo, slug: vagas.slug, empresa: empresas.nome, ate: vagas.impulsoAte })
    .from(vagas)
    .innerJoin(empresas, eq(empresas.id, vagas.empresaId))
    .where(gt(vagas.impulsoAte, agora))
    .orderBy(vagas.impulsoAte);
}

/** Pagamento recebido: a vaga entra no ar pelo prazo do pedido, somado ao que ainda faltar. */
export async function porImpulsoNoAr(db: Banco, pedidoId: string, agora = new Date()): Promise<boolean> {
  const [p] = await db.select({ vagaId: pedidosImpulso.vagaId, dias: pedidosImpulso.dias, ate: vagas.impulsoAte }).from(pedidosImpulso).innerJoin(vagas, eq(vagas.id, pedidosImpulso.vagaId)).where(and(eq(pedidosImpulso.id, pedidoId), eq(pedidosImpulso.estado, 'aberto')));
  if (!p) return false;
  const base = p.ate && p.ate > agora ? p.ate : agora;
  await db.update(vagas).set({ impulsoAte: new Date(base.getTime() + p.dias * DIA_MS) }).where(eq(vagas.id, p.vagaId));
  await db.update(pedidosImpulso).set({ estado: 'no_ar', resolvidoEm: agora }).where(eq(pedidosImpulso.id, pedidoId));
  return true;
}

export async function recusarImpulso(db: Banco, pedidoId: string, agora = new Date()) {
  await db.update(pedidosImpulso).set({ estado: 'recusado', resolvidoEm: agora }).where(and(eq(pedidosImpulso.id, pedidoId), eq(pedidosImpulso.estado, 'aberto')));
}

export async function tirarImpulso(db: Banco, vagaId: string) {
  await db.update(vagas).set({ impulsoAte: null }).where(eq(vagas.id, vagaId));
}
