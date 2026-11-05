import { beforeAll, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { aplicarEvento, arteValida, planoDe } from '@/lib/planos';
import { assinar, cancelar } from '@/lib/planos';
import type { Banco } from '@/lib/db/client';
import { vagas } from '@/lib/db/schema';
import { errosVaga } from '@/lib/forms/vaga';
import { bancoEmMemoria, umaEmpresa, umaVaga } from '@/lib/teste-apoio';
import { alternarDestaque, anunciarEmpresa, buscarVagas, empresasDoLetreiro, tirarAnuncio, vagasAnunciadas, vagasQueCombinam, mudarEstadoVaga, publicarSemConta, publicarVaga, vagaAceitaCandidatura, vagaPublica, vagasParecidas } from './vagas';

let db: Banco;
beforeAll(async () => {
  db = await bancoEmMemoria();
});

describe('publicar', () => {
  it('nasce conta, empresa e vaga; e-mail repetido não sobrescreve', async () => {
    const d = { nome: 'Ana', email: 'dup@exemplo.com', telefone: '17999999999', empresa: 'Dup', vaga: umaVaga() };
    const r = await publicarSemConta(db, d);
    expect(r.ok).toBe(true);
    expect(await publicarSemConta(db, { ...d, empresa: 'Outra' })).toEqual({ ok: false, contaExistente: true });
  });
  it('slug único para o mesmo título', async () => {
    const [a, b] = [await umaEmpresa(db), await umaEmpresa(db)];
    expect(a.slug).not.toBe(b.slug);
    expect(a.slug).toMatch(/^tecnico-de-enfermagem-/);
  });
  it('form barra vazio e texto proibido', () => {
    const vazio = { titulo: '', area: '', contrato: '', modalidade: '', cidade: '', salarioTipo: '', salario: '', descricao: '', requisitos: '', beneficios: '' };
    expect(Object.keys(errosVaga(vazio)).length).toBe(9);
    const ok = { titulo: 'Caixa', area: 'Saúde', contrato: 'CLT', modalidade: 'Remoto', cidade: 'mirassol', salarioTipo: 'combinar', salario: '', descricao: 'd'.repeat(30), requisitos: 'abc', beneficios: 'abc' };
    expect(errosVaga(ok)).toEqual({});
    expect(errosVaga({ ...ok, requisitos: 'Boa aparência' }).requisitos).toBeTruthy();
    expect(errosVaga({ ...ok, salarioTipo: 'valor', salario: '' }).salario).toBeTruthy();
  });
});

describe('estado da vaga', () => {
  it('vaga vencida ainda abre, sem aceitar candidatura, com parecidas', async () => {
    const e = await umaEmpresa(db, { area: 'Tecnologia', titulo: 'Programador' });
    await umaEmpresa(db, { area: 'Tecnologia', titulo: 'Analista de sistemas' });
    await db.update(vagas).set({ expiraEm: new Date(Date.now() - 1000) }).where(eq(vagas.id, e.vagaId));
    const v = await vagaPublica(db, e.slug);
    expect(v).not.toBeNull();
    expect(vagaAceitaCandidatura(v!)).toBe(false);
    const p = await vagasParecidas(db, v!);
    expect(p.map((x) => x.titulo)).toContain('Analista de sistemas');
    expect(p.map((x) => x.id)).not.toContain(e.vagaId);
  });
  it('encerrada não aceita candidatura', () => {
    expect(vagaAceitaCandidatura({ estado: 'encerrada', expiraEm: new Date(Date.now() + 1000) })).toBe(false);
    expect(vagaAceitaCandidatura({ estado: 'aberta', expiraEm: new Date(Date.now() + 1000) })).toBe(true);
  });
});

describe('vagas que combinam', () => {
  it('coloca primeiro a vaga parecida com o currículo', async () => {
    await umaEmpresa(db, { titulo: 'Soldador industrial', area: 'Indústria e produção' });
    await umaEmpresa(db, { titulo: 'Confeiteiro', area: 'Restaurantes e alimentação' });
    const lista = await vagasQueCombinam(db, { titulo: 'Soldador', texto: 'Trabalhei cinco anos como soldador em indústria metalúrgica' });
    expect(lista[0]!.titulo).toBe('Soldador industrial');
  });
  it('não confunde pedaços de palavra', async () => {
    await umaEmpresa(db, { titulo: 'Estagiário de recursos humanos', area: 'Recursos humanos' });
    await umaEmpresa(db, { titulo: 'Recepcionista noturna', area: 'Saúde' });
    const lista = await vagasQueCombinam(db, { titulo: 'Recepcionista', texto: 'Moro em São José do Rio Preto, cinco anos de experiência' });
    expect(lista[0]!.titulo).toBe('Recepcionista noturna');
  });
});

describe('letreiro', () => {
  it('só mostra empresa confirmada com vaga aberta', async () => {
    const a = await umaEmpresa(db, { titulo: 'Vaga do letreiro' });
    const b = await umaEmpresa(db, { titulo: 'Sem confirmar' }, false);
    await anunciarEmpresa(db, a.empresaId, 30);
    await anunciarEmpresa(db, b.empresaId, 30);
    const nomes = (await empresasDoLetreiro(db)).map((e) => e.id);
    expect(nomes).toContain(a.empresaId);
    expect(nomes).not.toContain(b.empresaId);
    await db.update(vagas).set({ estado: 'encerrada' }).where(eq(vagas.id, a.vagaId));
    expect((await empresasDoLetreiro(db)).map((e) => e.id)).not.toContain(a.empresaId);
  });
});

describe('busca', () => {
  it('ignora acento e maiúscula', async () => {
    await umaEmpresa(db, { titulo: 'Técnico de Radiologia' });
    const { itens } = await buscarVagas(db, { q: 'TECNICO radiologia' });
    expect(itens.map((i) => i.titulo)).toContain('Técnico de Radiologia');
  });
  it('% e _ não são curingas', async () => {
    expect((await buscarVagas(db, { q: '%%' })).total).toBeGreaterThanOrEqual(0);
    expect((await buscarVagas(db, { q: 'a%b_c' })).itens).toEqual([]);
  });
  it('e-mail não confirmado fica fora da busca, mas a página abre', async () => {
    const e = await umaEmpresa(db, { titulo: 'Padeiro confeiteiro' }, false);
    expect((await buscarVagas(db, { q: 'padeiro' })).itens).toEqual([]);
    expect(await vagaPublica(db, e.slug)).not.toBeNull();
  });
  it('filtra por cidade e destaque vem primeiro', async () => {
    const a = await umaEmpresa(db, { titulo: 'Vendedor de loja', cidadeSlug: 'mirassol' });
    const b = await umaEmpresa(db, { titulo: 'Vendedor externo', cidadeSlug: 'mirassol' });
    await db.update(vagas).set({ destaque: true }).where(eq(vagas.id, a.vagaId));
    const { itens } = await buscarVagas(db, { q: 'vendedor', cidade: 'mirassol' });
    expect(itens[0]!.id).toBe(a.vagaId);
    expect(itens.map((i) => i.id)).toContain(b.vagaId);
    expect((await buscarVagas(db, { q: 'vendedor', cidade: 'cedral' })).itens).toEqual([]);
  });
});

describe('planos', () => {
  it('grátis: terceira vaga aberta é barrada; encerrar libera', async () => {
    const e = await umaEmpresa(db);
    expect((await publicarVaga(db, e.usuarioId, e.empresaId, umaVaga())).ok).toBe(true);
    expect((await publicarVaga(db, e.usuarioId, e.empresaId, umaVaga())).ok).toBe(false);
    await mudarEstadoVaga(db, e.usuarioId, e.empresaId, e.vagaId, 'encerrada');
    expect((await publicarVaga(db, e.usuarioId, e.empresaId, umaVaga())).ok).toBe(true);
    const r = await mudarEstadoVaga(db, e.usuarioId, e.empresaId, e.vagaId, 'aberta');
    expect(r.ok).toBe(false);
  });
  it('assinatura vencida volta ao grátis sem fechar vagas, só barra novas', async () => {
    const e = await umaEmpresa(db);
    await aplicarEvento(db, { id: `t-${e.usuarioId}`, usuarioId: e.usuarioId, plano: 'essencial', tipo: 'pago', fimEm: new Date(Date.now() + 86400000) });
    expect(await planoDe(db, e.usuarioId)).toBe('essencial');
    expect((await publicarVaga(db, e.usuarioId, e.empresaId, umaVaga())).ok).toBe(true);
    expect((await publicarVaga(db, e.usuarioId, e.empresaId, umaVaga())).ok).toBe(true);
    const depois = new Date(Date.now() + 2 * 86400000);
    expect(await planoDe(db, e.usuarioId, depois)).toBe('gratis');
    await aplicarEvento(db, { id: `t2-${e.usuarioId}`, usuarioId: e.usuarioId, plano: 'essencial', tipo: 'pago', fimEm: new Date(Date.now() - 1000) });
    expect((await publicarVaga(db, e.usuarioId, e.empresaId, umaVaga())).ok).toBe(false);
    const [v] = await db.select().from(vagas).where(eq(vagas.id, e.vagaId));
    expect(v!.estado).toBe('aberta');
  });
  it('evento repetido não aplica duas vezes', async () => {
    const e = await umaEmpresa(db);
    const ev = { id: `dup-${e.usuarioId}`, usuarioId: e.usuarioId, plano: 'essencial', tipo: 'pago' as const, fimEm: new Date(Date.now() + 86400000) };
    expect(await aplicarEvento(db, ev)).toBe(true);
    expect(await aplicarEvento(db, { ...ev, plano: 'profissional' })).toBe(false);
    expect(await planoDe(db, e.usuarioId)).toBe('essencial');
  });
  it('arte: guarda o que existe e descarta o resto', () => {
    const a = arteValida({ modelo: 'tipografica', fundo: '#123456', fonte: 'times', formato: 'stories', chamada: 'Precisa-se', qrEstilo: 'pontos' });
    expect(a).toMatchObject({ modelo: 'tipografica', fundo: '#123456', fonte: 'times', formato: 'stories', chamada: 'Precisa-se', qrEstilo: 'pontos' });
    const b = arteValida({ modelo: 'x', fundo: 'red;<script>', fonte: 'comic', chamada: 'Pague aqui', qr: 'whatsapp', whatsapp: '123' });
    expect(b).toMatchObject({ modelo: 'cartao', fundo: '#DCEBFB', fonte: 'inter', chamada: 'Estamos contratando', qr: 'vaga', whatsapp: '' });
    expect(arteValida({ destaques: ['Vale-transporte', '', 'Pague taxa de inscrição', 'a', 'b', 'c'] }).destaques).toEqual(['Vale-transporte', 'a', 'b']);
    expect(arteValida({}).destaques).toBeUndefined();
    expect(arteValida({ modelo: 'placa' }).modelo).toBe('cartao');
    expect(arteValida({ modelo: 'etiqueta' }).modelo).toBe('ingresso');
    expect(arteValida({ alinhamento: 'centro', posicao: 'topo', focoX: 150, focoY: -3, tituloArte: ' Caixa ' })).toMatchObject({ alinhamento: 'centro', posicao: 'topo', focoX: 100, focoY: 0, tituloArte: 'Caixa' });
    expect(arteValida({ alinhamento: 'x' as never, posicao: 'y' as never, tituloArte: 'Pague taxa de inscrição' })).toMatchObject({ alinhamento: 'esquerda', posicao: 'base' });
    expect(arteValida({ tituloArte: 'Pague taxa de inscrição' }).tituloArte).toBeUndefined();
    expect(arteValida({ qr: 'whatsapp', whatsapp: '+55 17 99999-9999' })).toMatchObject({ qr: 'whatsapp', whatsapp: '17999999999' });
  });
  it('destaque respeita a cota', async () => {
    const e = await umaEmpresa(db);
    expect((await alternarDestaque(db, e.usuarioId, e.empresaId, e.vagaId)).ok).toBe(false);
    await assinar(db, e.usuarioId, 'essencial');
    expect((await alternarDestaque(db, e.usuarioId, e.empresaId, e.vagaId)).ok).toBe(true);
    const n = await publicarVaga(db, e.usuarioId, e.empresaId, umaVaga());
    expect(n.ok && (await alternarDestaque(db, e.usuarioId, e.empresaId, n.vagaId)).ok).toBe(false);
  });
  it('plano de candidato não serve para empresa; cancelar mantém até o fim', async () => {
    const e = await umaEmpresa(db);
    expect((await assinar(db, e.usuarioId, 'plus')).ok).toBe(false);
    expect((await assinar(db, e.usuarioId, 'gratis')).ok).toBe(false);
    await assinar(db, e.usuarioId, 'profissional');
    await cancelar(db, e.usuarioId);
    expect(await planoDe(db, e.usuarioId)).toBe('profissional');
  });
  it('sem provedor não assina', async () => {
    const e = await umaEmpresa(db);
    expect(await assinar(db, e.usuarioId, 'essencial', null)).toEqual({ ok: false, erro: 'A assinatura ainda não está disponível.' });
  });
});

describe('tela inicial só com anúncio pago', () => {
  it('sem anúncio não aparece; com anúncio aparece até vencer; tirar do ar some na hora', async () => {
    const pagou = await umaEmpresa(db, { titulo: 'Vaga anunciada' });
    const naoPagou = await umaEmpresa(db, { titulo: 'Vaga sem anúncio' });
    const ids = async (agora?: Date) => (await vagasAnunciadas(db, agora)).map((v) => v.id);
    expect(await ids()).not.toContain(pagou.vagaId);
    expect(await anunciarEmpresa(db, pagou.empresaId, 7)).toBe(true);
    expect(await ids()).toContain(pagou.vagaId);
    expect(await ids()).not.toContain(naoPagou.vagaId);
    expect((await empresasDoLetreiro(db)).map((e) => e.id)).not.toContain(naoPagou.empresaId);
    // Vence depois do prazo; estender soma ao que falta.
    expect(await ids(new Date(Date.now() + 8 * 86400000))).not.toContain(pagou.vagaId);
    await anunciarEmpresa(db, pagou.empresaId, 7);
    expect(await ids(new Date(Date.now() + 8 * 86400000))).toContain(pagou.vagaId);
    await tirarAnuncio(db, pagou.empresaId);
    expect(await ids()).not.toContain(pagou.vagaId);
    expect(await anunciarEmpresa(db, pagou.empresaId, 0)).toBe(false);
  });
});
