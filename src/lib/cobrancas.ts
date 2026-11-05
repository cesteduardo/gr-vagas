import { and, desc, eq, gt, isNull, lte } from 'drizzle-orm';
import { planosDoTipo, URL_SITE } from '@/lib/config';
import type { Banco } from '@/lib/db/client';
import { assinaturas, cobrancas, eventosPagamento, pedidosImpulso, usuarios, vagas } from '@/lib/db/schema';
import { enviarEmail, type EnviarEmail } from '@/lib/email';
import { criarCheckout, type AvisoAsaas, pagamentoDoAviso } from '@/lib/pagamentos/asaas';
import { formatarData } from '@/lib/texto';

// Cobranças pelo Asaas: cada mês de plano e cada impulso abre uma página de pagamento (Pix ou cartão).
// O aviso de pagamento do Asaas libera o mês ou marca o impulso como pago.

const DIA_MS = 24 * 60 * 60 * 1000;
const MES_MS = 30 * DIA_MS;
type Chamar = typeof fetch;

export async function abrirCobrancaPlano(db: Banco, usuarioId: string, planoId: string, chamar?: Chamar): Promise<string> {
  const [u] = await db.select({ tipo: usuarios.tipo }).from(usuarios).where(eq(usuarios.id, usuarioId));
  const plano = u ? planosDoTipo(u.tipo).find((p) => p.id === planoId && p.preco > 0) : undefined;
  if (!u || !plano) throw new Error('Plano inválido.');
  const volta = `${URL_SITE}${u.tipo === 'contratante' ? '/painel/plano' : '/candidato/plano'}`;
  const c = await criarCheckout({ referencia: `plano:${usuarioId}:${plano.id}`, nome: `GR Vagas ${plano.nome}`, descricao: `Plano ${plano.nome} por 30 dias`, valor: plano.preco, voltaSucesso: `${volta}?pago=1`, voltaCancelado: volta }, chamar);
  await db.insert(cobrancas).values({ id: c.id, tipo: 'plano', usuarioId, plano: plano.id, valorCentavos: Math.round(plano.preco * 100), link: c.link });
  return c.link;
}

export async function abrirCobrancaImpulso(db: Banco, usuarioId: string, empresaId: string, pedidoId: string, chamar?: Chamar): Promise<string> {
  const [p] = await db.select({ dias: pedidosImpulso.dias, valorCentavos: pedidosImpulso.valorCentavos, vagaId: pedidosImpulso.vagaId, titulo: vagas.titulo, pagoEm: pedidosImpulso.pagoEm }).from(pedidosImpulso).innerJoin(vagas, eq(vagas.id, pedidosImpulso.vagaId)).where(and(eq(pedidosImpulso.id, pedidoId), eq(pedidosImpulso.empresaId, empresaId), eq(pedidosImpulso.estado, 'aberto')));
  if (!p || p.pagoEm) throw new Error('Pedido não encontrado ou já pago.');
  const volta = `${URL_SITE}/painel/vagas/${p.vagaId}?aba=impulsionar`;
  const c = await criarCheckout({ referencia: `impulso:${pedidoId}`, nome: `Impulso ${p.dias} dias`, descricao: `Impulso da vaga ${p.titulo} na tela inicial do GR Vagas`, valor: p.valorCentavos / 100, voltaSucesso: `${volta}&pago=1`, voltaCancelado: volta }, chamar);
  await db.insert(cobrancas).values({ id: c.id, tipo: 'impulso', usuarioId, pedidoImpulsoId: pedidoId, valorCentavos: p.valorCentavos, link: c.link });
  return c.link;
}

// O mesmo pagamento chega mais de uma vez (CHECKOUT_PAID e PAYMENT_RECEIVED, e o Asaas repete): só o primeiro conta.
export async function registrarPagamento(db: Banco, aviso: AvisoAsaas, agora = new Date()): Promise<'pago' | 'repetido' | 'ignorado'> {
  const p = pagamentoDoAviso(aviso);
  if (!p) return 'ignorado';
  let [c] = p.checkoutId ? await db.select().from(cobrancas).where(eq(cobrancas.id, p.checkoutId)) : [];
  if (!c && p.referencia) {
    const [tipo, a, b] = p.referencia.split(':');
    const onde = tipo === 'plano' && a && b ? and(eq(cobrancas.tipo, 'plano'), eq(cobrancas.usuarioId, a), eq(cobrancas.plano, b)) : tipo === 'impulso' && a ? and(eq(cobrancas.tipo, 'impulso'), eq(cobrancas.pedidoImpulsoId, a)) : undefined;
    if (onde) [c] = await db.select().from(cobrancas).where(and(onde, isNull(cobrancas.pagoEm))).orderBy(desc(cobrancas.criadoEm)).limit(1);
  }
  if (!c) return 'ignorado';
  const cobranca = c;
  return db.transaction(async (tx) => {
    const [novo] = await tx.insert(eventosPagamento).values({ id: `asaas:${p.evento}` }).onConflictDoNothing().returning({ id: eventosPagamento.id });
    if (!novo) return 'repetido';
    const marcada = await tx.update(cobrancas).set({ pagoEm: agora }).where(and(eq(cobrancas.id, cobranca.id), isNull(cobrancas.pagoEm))).returning({ id: cobrancas.id });
    if (!marcada.length) return 'repetido';
    if (cobranca.tipo === 'plano' && cobranca.plano) {
      const [a] = await tx.select({ plano: assinaturas.plano, fimEm: assinaturas.fimEm }).from(assinaturas).where(eq(assinaturas.usuarioId, cobranca.usuarioId));
      // Mesmo plano ainda valendo: o mês novo começa onde o atual termina.
      const base = a && a.plano === cobranca.plano && a.fimEm > agora ? a.fimEm : agora;
      const fimEm = new Date(base.getTime() + MES_MS);
      await tx.insert(assinaturas).values({ usuarioId: cobranca.usuarioId, plano: cobranca.plano, estado: 'ativa', provedor: 'asaas', fimEm }).onConflictDoUpdate({ target: assinaturas.usuarioId, set: { plano: cobranca.plano, estado: 'ativa', provedor: 'asaas', fimEm, avisoRenovacaoEm: null } });
    } else if (cobranca.tipo === 'impulso' && cobranca.pedidoImpulsoId) {
      await tx.update(pedidosImpulso).set({ pagoEm: agora }).where(eq(pedidosImpulso.id, cobranca.pedidoImpulsoId));
    }
    return 'pago';
  });
}

// Três dias antes do fim, um e-mail com o link para pagar mais um mês. Uma vez por período.
export async function avisarRenovacoes(db: Banco, enviar: EnviarEmail = enviarEmail, agora = new Date()): Promise<number> {
  const lista = await db
    .select({ usuarioId: assinaturas.usuarioId, plano: assinaturas.plano, fimEm: assinaturas.fimEm, email: usuarios.email, tipo: usuarios.tipo })
    .from(assinaturas)
    .innerJoin(usuarios, eq(usuarios.id, assinaturas.usuarioId))
    .where(and(eq(assinaturas.provedor, 'asaas'), eq(assinaturas.estado, 'ativa'), gt(assinaturas.fimEm, agora), lte(assinaturas.fimEm, new Date(agora.getTime() + 3 * DIA_MS)), isNull(assinaturas.avisoRenovacaoEm)));
  let n = 0;
  for (const a of lista) {
    const nome = planosDoTipo(a.tipo).find((p) => p.id === a.plano)?.nome ?? a.plano;
    const link = `${URL_SITE}${a.tipo === 'contratante' ? '/painel/plano' : '/candidato/plano'}`;
    if (await enviar(a.email, `Seu plano ${nome} vence em ${formatarData(a.fimEm)}`, `Seu plano ${nome} no GR Vagas vale até ${formatarData(a.fimEm)}.\n\nPara continuar, pague mais um mês por Pix ou cartão: ${link}\n\nSe não renovar, a conta volta para o Grátis, sem perder nada do que já está lá.`)) {
      await db.update(assinaturas).set({ avisoRenovacaoEm: agora }).where(eq(assinaturas.usuarioId, a.usuarioId));
      n += 1;
    }
  }
  return n;
}
