import { beforeAll, describe, expect, it, vi } from 'vitest';
import { eq } from 'drizzle-orm';
import type { Banco } from '@/lib/db/client';
import { vagas } from '@/lib/db/schema';
import { bancoEmMemoria, umaEmpresa } from '@/lib/teste-apoio';
import { vagasAnunciadas } from '@/lib/vagas';
import { cancelarPedidoImpulso, pedidosAbertos, pedirImpulso, porImpulsoNoAr, recusarImpulso, situacaoDoImpulso, tirarImpulso } from './impulsos';

let db: Banco;
beforeAll(async () => {
  db = await bancoEmMemoria();
  process.env.ADMIN_EMAILS = 'dono@exemplo.com';
});

describe('impulso de vaga', () => {
  it('pede, avisa o administrador e só aparece na tela inicial depois de posto no ar', async () => {
    const e = await umaEmpresa(db, { titulo: 'Vaga impulsionada' });
    const avisar = vi.fn(async () => true);
    expect(await pedirImpulso(db, e.empresaId, e.vagaId, 15, avisar)).toEqual({ ok: true });
    expect(avisar).toHaveBeenCalledWith('dono@exemplo.com', expect.stringContaining('Vaga impulsionada'), expect.stringContaining('/admin/impulsos'));
    expect((await pedirImpulso(db, e.empresaId, e.vagaId, 7, avisar)).ok).toBe(false);
    const ids = async (agora?: Date) => (await vagasAnunciadas(db, agora)).map((v) => v.id);
    expect(await ids()).not.toContain(e.vagaId);

    const [pedido] = (await pedidosAbertos(db)).filter((p) => p.vagaTitulo === 'Vaga impulsionada');
    expect(pedido).toMatchObject({ dias: 15, valorCentavos: 3490 });
    expect(await porImpulsoNoAr(db, pedido!.id)).toBe(true);
    expect(await porImpulsoNoAr(db, pedido!.id)).toBe(false);
    expect(await ids()).toContain(e.vagaId);
    expect((await situacaoDoImpulso(db, e.vagaId)).pedido).toBeNull();

    // Pedir mais soma ao prazo que falta.
    await pedirImpulso(db, e.empresaId, e.vagaId, 7, avisar);
    const [mais] = (await pedidosAbertos(db)).filter((p) => p.vagaTitulo === 'Vaga impulsionada');
    await porImpulsoNoAr(db, mais!.id);
    expect(await ids(new Date(Date.now() + 20 * 86400000))).toContain(e.vagaId);
    expect(await ids(new Date(Date.now() + 23 * 86400000))).not.toContain(e.vagaId);

    await tirarImpulso(db, e.vagaId);
    expect(await ids()).not.toContain(e.vagaId);
  });

  it('não aceita prazo inventado, vaga de outra empresa nem vaga encerrada; recusar e cancelar fecham o pedido', async () => {
    const e = await umaEmpresa(db);
    const outra = await umaEmpresa(db);
    const avisar = vi.fn(async () => true);
    expect((await pedirImpulso(db, e.empresaId, e.vagaId, 3, avisar)).ok).toBe(false);
    expect((await pedirImpulso(db, outra.empresaId, e.vagaId, 7, avisar)).ok).toBe(false);
    await pedirImpulso(db, e.empresaId, e.vagaId, 7, avisar);
    const { pedido } = await situacaoDoImpulso(db, e.vagaId);
    await cancelarPedidoImpulso(db, outra.empresaId, pedido!.id);
    expect((await situacaoDoImpulso(db, e.vagaId)).pedido).not.toBeNull();
    await recusarImpulso(db, pedido!.id);
    expect((await situacaoDoImpulso(db, e.vagaId)).pedido).toBeNull();
    await db.update(vagas).set({ estado: 'encerrada' }).where(eq(vagas.id, e.vagaId));
    expect((await pedirImpulso(db, e.empresaId, e.vagaId, 7, avisar)).ok).toBe(false);
  });
});
