import { beforeAll, describe, expect, it, vi } from 'vitest';
import { eq } from 'drizzle-orm';
import type { Banco } from '@/lib/db/client';
import { candidaturas, usuarios, vagas } from '@/lib/db/schema';
import { bancoEmMemoria, umaEmpresa } from '@/lib/teste-apoio';
import { acessoCandidatura, caixaDeEntrada, candidatarLogado, candidatarSemConta, candidaturasDaVaga, conversa, enviarMensagem, marcarLida, mudarEtapa, naoLidas } from './candidaturas';

let db: Banco;
let n = 0;
beforeAll(async () => {
  db = await bancoEmMemoria();
});

async function umCandidato(vagaId: string) {
  n += 1;
  const email = `cand${n}@exemplo.com.br`;
  const r = await candidatarSemConta(db, { nome: 'Bruno Lima', email, telefone: '17988887777', vagaId });
  if (!r.ok) throw new Error(r.erro);
  const [u] = await db.select().from(usuarios).where(eq(usuarios.email, email));
  return { id: u!.id, tipo: 'candidato' as const, email, candidaturaId: r.candidaturaId, sessao: r.sessao };
}

describe('candidatar', () => {
  it('novo: nasce conta e sessão', async () => {
    const e = await umaEmpresa(db);
    const c = await umCandidato(e.vagaId);
    expect(c.sessao).toBeTruthy();
    expect(await candidaturasDaVaga(db, e.empresaId, e.vagaId, e.usuarioId)).toHaveLength(1);
  });
  it('e-mail existente sem login: nem candidatura nem sessão', async () => {
    const e = await umaEmpresa(db);
    const c = await umCandidato(e.vagaId);
    const outra = await umaEmpresa(db);
    const r = await candidatarSemConta(db, { nome: 'Impostor', email: c.email, telefone: '17900000000', vagaId: outra.vagaId });
    expect(r).toMatchObject({ ok: false, contaExistente: true });
    expect('sessao' in r).toBe(false);
    expect(await candidaturasDaVaga(db, outra.empresaId, outra.vagaId, outra.usuarioId)).toHaveLength(0);
    const [u] = await db.select().from(usuarios).where(eq(usuarios.email, c.email));
    expect(u!.nome).toBe('Bruno Lima');
  });
  it('duas vezes na mesma vaga fica uma só', async () => {
    const e = await umaEmpresa(db);
    const c = await umCandidato(e.vagaId);
    const r = await candidatarLogado(db, c, e.vagaId);
    expect(r).toMatchObject({ ok: true, candidaturaId: c.candidaturaId });
    expect(await candidaturasDaVaga(db, e.empresaId, e.vagaId, e.usuarioId)).toHaveLength(1);
  });
  it('vaga fechada não recebe', async () => {
    const e = await umaEmpresa(db);
    await db.update(vagas).set({ estado: 'encerrada' }).where(eq(vagas.id, e.vagaId));
    expect((await candidatarSemConta(db, { nome: 'Ana', email: 'fechada@exemplo.com', telefone: '17988887777', vagaId: e.vagaId })).ok).toBe(false);
  });
  it('conta de empresa não se candidata', async () => {
    const e = await umaEmpresa(db);
    expect((await candidatarLogado(db, { id: e.usuarioId, tipo: 'contratante' }, e.vagaId)).ok).toBe(false);
  });
});

describe('conversa', () => {
  it('não lidas por lado e leitura', async () => {
    const e = await umaEmpresa(db);
    const c = await umCandidato(e.vagaId);
    const avisar = vi.fn(async () => true);
    await enviarMensagem(db, { candidaturaId: c.candidaturaId, autorId: c.id, texto: 'Olá' }, avisar);
    expect(await naoLidas(db, e.usuarioId, 'empresa')).toBe(1);
    expect(await naoLidas(db, c.id, 'candidato')).toBe(0);
    const a = await acessoCandidatura(db, c.candidaturaId, e.usuarioId);
    await marcarLida(db, a!);
    expect(await naoLidas(db, e.usuarioId, 'empresa')).toBe(0);
    expect((await acessoCandidatura(db, c.candidaturaId, e.usuarioId))!.vistaEm).not.toBeNull();
    await enviarMensagem(db, { candidaturaId: c.candidaturaId, autorId: e.usuarioId, texto: 'Oi, Bruno' }, avisar);
    expect(await naoLidas(db, c.id, 'candidato')).toBe(1);
    expect(await conversa(db, c.candidaturaId, c.id)).toHaveLength(2);
  });
  it('mensagem vazia ou enorme é barrada', async () => {
    const e = await umaEmpresa(db);
    const c = await umCandidato(e.vagaId);
    expect((await enviarMensagem(db, { candidaturaId: c.candidaturaId, autorId: c.id, texto: '   ' })).ok).toBe(false);
    expect((await enviarMensagem(db, { candidaturaId: c.candidaturaId, autorId: c.id, texto: 'x'.repeat(2001) })).ok).toBe(false);
  });
  it('avisa no máximo uma vez a cada 15 minutos', async () => {
    const e = await umaEmpresa(db);
    const c = await umCandidato(e.vagaId);
    const avisar = vi.fn(async () => true);
    const t0 = Date.now();
    await enviarMensagem(db, { candidaturaId: c.candidaturaId, autorId: c.id, texto: 'a', agora: new Date(t0) }, avisar);
    await enviarMensagem(db, { candidaturaId: c.candidaturaId, autorId: c.id, texto: 'b', agora: new Date(t0 + 60000) }, avisar);
    expect(avisar).toHaveBeenCalledTimes(1);
    expect(avisar.mock.calls[0]).toBeDefined();
    await enviarMensagem(db, { candidaturaId: c.candidaturaId, autorId: c.id, texto: 'c', agora: new Date(t0 + 16 * 60000) }, avisar);
    expect(avisar).toHaveBeenCalledTimes(2);
  });
  it('etapa válida muda; inválida não', async () => {
    const e = await umaEmpresa(db);
    const c = await umCandidato(e.vagaId);
    expect(await mudarEtapa(db, c.candidaturaId, e.usuarioId, 'entrevista')).toBe(true);
    expect(await mudarEtapa(db, c.candidaturaId, e.usuarioId, 'hackeada')).toBe(false);
    const [l] = await db.select().from(candidaturas).where(eq(candidaturas.id, c.candidaturaId));
    expect(l!.etapa).toBe('entrevista');
  });
});

describe('caixa de entrada', () => {
  it('mostra a última mensagem, quem mandou e as não lidas, a mais recente primeiro', async () => {
    const e = await umaEmpresa(db);
    const c = await umCandidato(e.vagaId);
    const outra = await umaEmpresa(db, { titulo: 'Recepcionista' });
    const r = await candidatarLogado(db, c, outra.vagaId);
    if (!r.ok) throw new Error(r.erro);
    const avisar = vi.fn(async () => true);
    await enviarMensagem(db, { candidaturaId: c.candidaturaId, autorId: e.usuarioId, texto: 'Pode vir amanhã às 10h?', agora: new Date(Date.now() + 1000) }, avisar);
    await enviarMensagem(db, { candidaturaId: r.candidaturaId, autorId: c.id, texto: 'Tenho interesse', agora: new Date(Date.now() + 2000) }, avisar);

    const doCandidato = await caixaDeEntrada(db, c.id, 'candidato');
    expect(doCandidato.map((x) => x.id)).toEqual([r.candidaturaId, c.candidaturaId]);
    expect(doCandidato[0]).toMatchObject({ ultimaTexto: 'Tenho interesse', minha: true, naoLidas: 0 });
    expect(doCandidato[1]).toMatchObject({ ultimaTexto: 'Pode vir amanhã às 10h?', minha: false, naoLidas: 1, nome: 'Empresa ' + e.email.match(/rh(\d+)/)![1] });

    const daEmpresa = await caixaDeEntrada(db, e.usuarioId, 'empresa');
    expect(daEmpresa).toHaveLength(1);
    expect(daEmpresa[0]).toMatchObject({ nome: 'Bruno Lima', minha: true, naoLidas: 0, imagem: null });
    expect(await caixaDeEntrada(db, outra.usuarioId, 'empresa')).toHaveLength(1);
  });
});
