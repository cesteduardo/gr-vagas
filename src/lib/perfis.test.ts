import { beforeAll, describe, expect, it, vi } from 'vitest';
import { eq } from 'drizzle-orm';
import { candidatarSemConta } from '@/lib/candidaturas';
import type { Banco } from '@/lib/db/client';
import { candidaturas, denuncias, mensagens, perfis, usuarios, vagas } from '@/lib/db/schema';
import { aplicarEvento } from '@/lib/planos';
import { bancoEmMemoria, umaEmpresa } from '@/lib/teste-apoio';
import { denunciar, denunciasAbertas, resolverDenuncia } from '@/lib/vagas';
import { enviarMensagem } from '@/lib/candidaturas';
import { fotoParaVer, perfilParaEmpresa } from './perfis';
import { alternarSalva, apresentacao, compatibilidade, buscarTalentos, criarAlerta, dadosDoUsuario, enviarAlertas, excluirConta, guardarCurriculo, salvarPerfil, validarPdf, vagasSalvas } from './perfis';

let db: Banco;
let n = 0;
beforeAll(async () => {
  db = await bancoEmMemoria();
});

async function candidato(vagaId: string, nome = 'Bruno Lima') {
  n += 1;
  const email = `p${n}@exemplo.com`;
  const r = await candidatarSemConta(db, { nome, email, telefone: '17988887777', vagaId });
  if (!r.ok) throw new Error(r.erro);
  const [u] = await db.select().from(usuarios).where(eq(usuarios.email, email));
  return { id: u!.id, candidaturaId: r.candidaturaId };
}

describe('currículo', () => {
  it('só PDF de verdade e até 3 MB', async () => {
    expect(validarPdf(Buffer.from('<html>'))).toBeTruthy();
    expect(validarPdf(Buffer.concat([Buffer.from('%PDF'), Buffer.alloc(3 * 1024 * 1024)]))).toBeTruthy();
    expect(validarPdf(Buffer.from('%PDF-1.7'))).toBeNull();
    const e = await umaEmpresa(db);
    const c = await candidato(e.vagaId);
    expect(await guardarCurriculo(db, c.id, '../../etc/passwd.pdf', Buffer.from('%PDF-1.7'))).toBeNull();
    const [p] = await db.select().from(perfis).where(eq(perfis.usuarioId, c.id));
    expect(p!.curriculoNome).not.toContain('/');
  });
});

describe('talentos', () => {
  it('só lista quem aceitou, Plus primeiro', async () => {
    const e = await umaEmpresa(db);
    const [a, b, c] = [await candidato(e.vagaId, 'Ana'), await candidato(e.vagaId, 'Bia'), await candidato(e.vagaId, 'Caio')];
    await salvarPerfil(db, a.id, { titulo: 'Soldador', cidadeSlug: 'cedral', resumo: 'Experiência', aceiteTalentos: true });
    await salvarPerfil(db, b.id, { titulo: 'Soldador', cidadeSlug: 'cedral', resumo: 'Experiência', aceiteTalentos: true });
    await salvarPerfil(db, c.id, { titulo: 'Soldador', cidadeSlug: 'cedral', resumo: 'Experiência', aceiteTalentos: false });
    await aplicarEvento(db, { id: `plus-${b.id}`, usuarioId: b.id, plano: 'plus', tipo: 'pago', fimEm: new Date(Date.now() + 86400000) });
    const lista = await buscarTalentos(db, { q: 'SOLDADOR', cidade: 'cedral' });
    expect(lista.map((l) => l.nome)).toEqual(['Bia', 'Ana']);
  });
});

describe('salvas', () => {
  it('alterna', async () => {
    const e = await umaEmpresa(db);
    const c = await candidato(e.vagaId);
    expect(await alternarSalva(db, c.id, e.vagaId)).toBe(true);
    expect(await vagasSalvas(db, c.id)).toHaveLength(1);
    expect(await alternarSalva(db, c.id, e.vagaId)).toBe(false);
  });
});

describe('alertas', () => {
  it('não reenvia a mesma vaga; grátis espera um dia; Plus é imediato', async () => {
    const e = await umaEmpresa(db, { titulo: 'Eletricista predial' });
    const c = await candidato(e.vagaId);
    const p = await candidato(e.vagaId);
    await aplicarEvento(db, { id: `plus-${p.id}`, usuarioId: p.id, plano: 'plus', tipo: 'pago', fimEm: new Date(Date.now() + 3 * 86400000) });
    expect(await criarAlerta(db, c.id, 'eletricista', 'sao-jose-do-rio-preto')).toBeNull();
    expect(await criarAlerta(db, p.id, 'eletricista', 'sao-jose-do-rio-preto')).toBeNull();
    expect(await criarAlerta(db, c.id, 'a', 'x')).toBeTruthy();
    const enviar = vi.fn(async () => true);
    expect(await enviarAlertas(db, new Date(), enviar)).toBe(2);
    expect(await enviarAlertas(db, new Date(), enviar)).toBe(0);
    await umaEmpresa(db, { titulo: 'Eletricista industrial' });
    expect(await enviarAlertas(db, new Date(), enviar)).toBe(1);
    expect(await enviarAlertas(db, new Date(Date.now() + 25 * 3600000), enviar)).toBe(1);
  });
  it('falha de envio tenta de novo depois', async () => {
    const e = await umaEmpresa(db, { titulo: 'Jardineiro' });
    const c = await candidato(e.vagaId);
    await criarAlerta(db, c.id, 'jardineiro', 'sao-jose-do-rio-preto');
    expect(await enviarAlertas(db, new Date(), vi.fn(async () => false))).toBe(0);
    expect(await enviarAlertas(db, new Date(), vi.fn(async () => true))).toBe(1);
  });
});

describe('LGPD', () => {
  it('baixa dados e exclui tudo', async () => {
    const e = await umaEmpresa(db);
    const c = await candidato(e.vagaId);
    await enviarMensagem(db, { candidaturaId: c.candidaturaId, autorId: c.id, texto: 'Olá' }, async () => true);
    const d = await dadosDoUsuario(db, c.id);
    expect(d.candidaturas).toHaveLength(1);
    expect(d.mensagens).toHaveLength(1);
    await excluirConta(db, c.id);
    expect(await db.select().from(perfis).where(eq(perfis.usuarioId, c.id))).toEqual([]);
    expect(await db.select().from(candidaturas).where(eq(candidaturas.id, c.candidaturaId))).toEqual([]);
    expect(await db.select().from(mensagens).where(eq(mensagens.candidaturaId, c.candidaturaId))).toEqual([]);
    expect(await db.select().from(vagas).where(eq(vagas.id, e.vagaId))).toHaveLength(1);
  });
});

describe('denúncias', () => {
  it('registra, limita e encerra a vaga', async () => {
    const e = await umaEmpresa(db);
    expect(await denunciar(db, e.vagaId, 'Pediu taxa', 'ip-1')).toBe(true);
    const [d] = (await denunciasAbertas(db)).filter((x) => x.vagaId === e.vagaId);
    expect(d!.motivo).toBe('Pediu taxa');
    await resolverDenuncia(db, d!.id, true);
    const [v] = await db.select().from(vagas).where(eq(vagas.id, e.vagaId));
    expect(v!.estado).toBe('encerrada');
    expect((await db.select().from(denuncias).where(eq(denuncias.id, d!.id)))[0]!.estado).toBe('resolvida');
    for (let i = 0; i < 4; i += 1) await denunciar(db, e.vagaId, 'x', 'ip-2');
    expect(await denunciar(db, e.vagaId, 'x', 'ip-2')).toBe(true);
    expect(await denunciar(db, e.vagaId, 'x', 'ip-2')).toBe(false);
  });
});

describe('extras do Plus', () => {
  it('compatibilidade pesa o cargo e não confunde pedaços de palavra', () => {
    const v = { titulo: 'Recepcionista', requisitos: 'Atendimento ao público', area: 'Saúde' };
    expect(compatibilidade({ titulo: 'Recepcionista', resumo: 'Atendimento em clínicas' }, v)!.porcentagem).toBeGreaterThanOrEqual(70);
    expect(compatibilidade({ titulo: 'Soldador', resumo: 'Indústria' }, v)!.porcentagem).toBe(0);
    expect(compatibilidade({ titulo: '', resumo: '' }, v)).toBeNull();
  });
  it('apresentação usa só dados reais', () => {
    const t = apresentacao({ nome: 'Maria da Silva', titulo: 'Recepcionista', resumo: 'Cinco anos em clínicas. Outra frase.', vaga: 'Atendente', empresa: 'Clínica X' });
    expect(t).toContain('Sou Maria, recepcionista');
    expect(t).toContain('Cinco anos em clínicas.');
    expect(t).not.toContain('Outra frase');
    expect(apresentacao({ nome: 'Ana', titulo: '', resumo: '', vaga: 'Caixa', empresa: 'Loja' })).not.toContain('undefined');
  });
  it('candidatura de quem é Plus vem primeiro para a empresa', async () => {
    const { candidaturasDaVaga } = await import('@/lib/candidaturas');
    const e = await umaEmpresa(db);
    const a = await candidato(e.vagaId, 'Comum');
    const b = await candidato(e.vagaId, 'Assinante');
    void a;
    await aplicarEvento(db, { id: `plus-topo-${b.id}`, usuarioId: b.id, plano: 'plus', tipo: 'pago', fimEm: new Date(Date.now() + 86400000) });
    const lista = await candidaturasDaVaga(db, e.empresaId, e.vagaId, e.usuarioId);
    expect(lista[0]!.nome).toBe('Assinante');
    expect(lista[0]!.plus).toBe(true);
  });
});

describe('perfil do candidato para empresas', () => {
  it('empresa com conta vê o profissional, sem contato; candidato não vê o de outro', async () => {
    const e = await umaEmpresa(db);
    const c = await candidato(e.vagaId, 'Rita Souza');
    await salvarPerfil(db, c.id, { titulo: 'Recepcionista', cidadeSlug: 'mirassol', resumo: 'Cinco anos em clínica.', aceiteTalentos: false, cv: { endereco: 'Rua Secreta, 1', habilidades: ['Excel'] } });
    const outra = await umaEmpresa(db);
    const visto = await perfilParaEmpresa(db, outra.usuarioId, c.id);
    expect(visto).toMatchObject({ nome: 'Rita Souza', titulo: 'Recepcionista', conversas: [] });
    expect(JSON.stringify(visto)).not.toContain('Rua Secreta');
    expect(JSON.stringify(visto)).not.toContain('@exemplo.com');
    expect((await perfilParaEmpresa(db, e.usuarioId, c.id))!.conversas).toHaveLength(1);
    const outroCandidato = await candidato(e.vagaId, 'Caio Lima');
    expect(await perfilParaEmpresa(db, outroCandidato.id, c.id)).toBeNull();
  });

  it('perfil escondido só aparece para a empresa que recebeu a candidatura', async () => {
    const e = await umaEmpresa(db);
    const c = await candidato(e.vagaId, 'Lia Mota');
    await salvarPerfil(db, c.id, { titulo: 'Vendedora', cidadeSlug: 'mirassol', resumo: '', aceiteTalentos: false, visivelEmpresas: false });
    await db.update(perfis).set({ foto: Buffer.from('x'), fotoMime: 'image/png' }).where(eq(perfis.usuarioId, c.id));
    const outra = await umaEmpresa(db);
    expect(await perfilParaEmpresa(db, outra.usuarioId, c.id)).toBeNull();
    expect(await fotoParaVer(db, outra.usuarioId, c.id)).toBeNull();
    expect(await perfilParaEmpresa(db, e.usuarioId, c.id)).not.toBeNull();
    expect(await fotoParaVer(db, e.usuarioId, c.id)).not.toBeNull();
    await salvarPerfil(db, c.id, { titulo: 'Vendedora', cidadeSlug: 'mirassol', resumo: '', aceiteTalentos: false, visivelEmpresas: true });
    expect(await fotoParaVer(db, outra.usuarioId, c.id)).not.toBeNull();
  });
});
