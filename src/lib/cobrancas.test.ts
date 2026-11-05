import { beforeAll, describe, expect, it, vi } from 'vitest';
import { eq } from 'drizzle-orm';
import { criarConta } from '@/lib/auth/contas';
import type { Banco } from '@/lib/db/client';
import { assinaturas, pedidosImpulso } from '@/lib/db/schema';
import { bancoEmMemoria, umaEmpresa } from '@/lib/teste-apoio';
import { abrirCobrancaImpulso, abrirCobrancaPlano, avisarRenovacoes, registrarPagamento } from './cobrancas';
import { pedirImpulso } from './impulsos';
import { avisoAutentico } from './pagamentos/asaas';

let db: Banco;
beforeAll(async () => {
  db = await bancoEmMemoria();
  process.env.ASAAS_API_KEY = '$aact_hmlg_teste';
  process.env.ASAAS_WEBHOOK_TOKEN = 'um-token-de-teste-com-mais-de-32-caracteres';
});

let n = 0;
const asaasFalso = () => {
  n += 1;
  const id = `chk-${n}`;
  return vi.fn(async (_url: string | URL | Request, _init?: RequestInit) => new Response(JSON.stringify({ id, link: `https://sandbox.asaas.com/checkoutSession/show/${id}`, status: 'ACTIVE' }), { status: 200 }));
};

describe('cobrança do plano pelo Asaas', () => {
  it('abre o checkout com Pix e cartão, e o aviso libera 30 dias uma vez só', async () => {
    const c = await criarConta(db, { tipo: 'candidato', nome: 'Rui Lima', email: 'rui@exemplo.com', telefone: '17988887777', senha: 'segredo123' });
    const chamar = asaasFalso();
    const link = await abrirCobrancaPlano(db, c.usuarioId!, 'plus', chamar as unknown as typeof fetch);
    expect(link).toContain('checkoutSession');
    const [url, init] = chamar.mock.calls[0]!;
    expect(String(url)).toBe('https://api-sandbox.asaas.com/v3/checkouts');
    expect((init!.headers as Record<string, string>).access_token).toBe('$aact_hmlg_teste');
    const corpo = JSON.parse(String(init!.body));
    expect(corpo).toMatchObject({ billingTypes: ['PIX', 'CREDIT_CARD'], chargeTypes: ['DETACHED'], externalReference: `plano:${c.usuarioId}:plus` });
    expect(corpo.items[0]).toMatchObject({ quantity: 1, value: 9.9 });

    const agora = new Date('2026-11-05T12:00:00Z');
    expect(await registrarPagamento(db, { id: 'evt-1', event: 'CHECKOUT_PAID', checkout: { id: `chk-${n}` } }, agora)).toBe('pago');
    expect(await registrarPagamento(db, { id: 'evt-2', event: 'PAYMENT_RECEIVED', payment: { externalReference: `plano:${c.usuarioId}:plus` } }, agora)).toBe('ignorado');
    expect(await registrarPagamento(db, { id: 'evt-1', event: 'CHECKOUT_PAID', checkout: { id: `chk-${n}` } }, agora)).toBe('repetido');
    const [a] = await db.select().from(assinaturas).where(eq(assinaturas.usuarioId, c.usuarioId!));
    expect(a).toMatchObject({ plano: 'plus', estado: 'ativa', provedor: 'asaas' });
    expect(a!.fimEm.toISOString()).toBe('2026-12-05T12:00:00.000Z');

    // Mais um mês pago antes de vencer começa onde o atual termina.
    await abrirCobrancaPlano(db, c.usuarioId!, 'plus', asaasFalso() as unknown as typeof fetch);
    expect(await registrarPagamento(db, { id: 'evt-3', event: 'PAYMENT_CONFIRMED', payment: { externalReference: `plano:${c.usuarioId}:plus` } }, agora)).toBe('pago');
    const [b] = await db.select().from(assinaturas).where(eq(assinaturas.usuarioId, c.usuarioId!));
    expect(b!.fimEm.toISOString()).toBe('2027-01-04T12:00:00.000Z');
  });

  it('lembra a renovação três dias antes, uma vez por período', async () => {
    const c = await criarConta(db, { tipo: 'candidato', nome: 'Lia Lima', email: 'lia@exemplo.com', telefone: '17988887777', senha: 'segredo123' });
    const agora = new Date();
    await db.insert(assinaturas).values({ usuarioId: c.usuarioId!, plano: 'plus', estado: 'ativa', provedor: 'asaas', fimEm: new Date(agora.getTime() + 2 * 86400000) });
    const enviar = vi.fn(async () => true);
    expect(await avisarRenovacoes(db, enviar, agora)).toBeGreaterThanOrEqual(1);
    expect(enviar).toHaveBeenCalledWith('lia@exemplo.com', expect.stringContaining('Plus'), expect.stringContaining('/candidato/plano'));
    enviar.mockClear();
    await avisarRenovacoes(db, enviar, agora);
    expect(enviar).not.toHaveBeenCalledWith('lia@exemplo.com', expect.anything(), expect.anything());
  });
});

describe('cobrança do impulso pelo Asaas', () => {
  it('o aviso marca o pedido como pago, sem pôr no ar sozinho', async () => {
    const e = await umaEmpresa(db);
    await pedirImpulso(db, e.empresaId, e.vagaId, 7, vi.fn(async () => true));
    const [p] = await db.select().from(pedidosImpulso).where(eq(pedidosImpulso.vagaId, e.vagaId));
    await abrirCobrancaImpulso(db, e.usuarioId, e.empresaId, p!.id, asaasFalso() as unknown as typeof fetch);
    expect(await registrarPagamento(db, { id: 'evt-imp', event: 'PAYMENT_RECEIVED', payment: { checkoutSession: `chk-${n}` } })).toBe('pago');
    const [depois] = await db.select().from(pedidosImpulso).where(eq(pedidosImpulso.id, p!.id));
    expect(depois!.pagoEm).not.toBeNull();
    expect(depois!.estado).toBe('aberto');
    await expect(abrirCobrancaImpulso(db, e.usuarioId, e.empresaId, p!.id, asaasFalso() as unknown as typeof fetch)).rejects.toThrow();
  });
});

describe('aviso do Asaas', () => {
  it('só aceita o token configurado', () => {
    expect(avisoAutentico('um-token-de-teste-com-mais-de-32-caracteres')).toBe(true);
    expect(avisoAutentico('outro')).toBe(false);
    expect(avisoAutentico(null)).toBe(false);
  });
});
