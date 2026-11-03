import { beforeAll, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import type { Banco } from '@/lib/db/client';
import { empresas, perfis, sessoes, tentativas, usuarios } from '@/lib/db/schema';
import { bancoEmMemoria } from '@/lib/teste-apoio';
import { abrirSessao, criarConta, definirSenha, dentroDoLimite, destinoSeguro, encerrarSessao, entrarComSenha, limparVencidos, LINK_MS, linkValido, pedirLink, SESSAO_DIAS, temSenha, usarLink, usuarioDaSessao } from './contas';
import { conferirSenha, hashSenha } from './senha';

let db: Banco;
let n = 0;
beforeAll(async () => {
  db = await bancoEmMemoria();
});

async function umaConta(tipo: 'candidato' | 'contratante' = 'candidato', confirmar = false) {
  n += 1;
  const email = `pessoa${n}@exemplo.com.br`;
  const r = await criarConta(db, { tipo, nome: 'Ana Souza', email, telefone: '17999999999', senha: 'senhaforte123', empresa: 'Padaria da Ana' });
  if (!r.ok) throw new Error('falhou');
  if (confirmar) await db.update(usuarios).set({ emailConfirmadoEm: new Date() }).where(eq(usuarios.id, r.usuarioId));
  return { id: r.usuarioId, email };
}

describe('senha', () => {
  it('confere a certa e recusa a errada', async () => {
    const h = await hashSenha('senhaforte123');
    expect(h.startsWith('scrypt$')).toBe(true);
    expect(await conferirSenha('senhaforte123', h)).toBe(true);
    expect(await conferirSenha('senhaforte124', h)).toBe(false);
  });
  it('hash antigo, com custo menor, continua valendo', async () => {
    const { scryptSync } = await import('node:crypto');
    const sal = Buffer.from('0123456789abcdef');
    const antigo = ['scrypt', 16384, 8, 1, sal.toString('base64url'), scryptSync('senhaforte123', sal, 32, { N: 16384, r: 8, p: 1 }).toString('base64url')].join('$');
    expect(await conferirSenha('senhaforte123', antigo)).toBe(true);
  });
  it('sem hash ou com hash estragado, nunca confere', async () => {
    expect(await conferirSenha('qualquer', null)).toBe(false);
    expect(await conferirSenha('qualquer', 'lixo')).toBe(false);
  });
});

describe('criar conta', () => {
  it('empresa nasce com a conta do contratante e perfil com a do candidato', async () => {
    const e = await umaConta('contratante');
    expect(await db.select().from(empresas).where(eq(empresas.donoId, e.id))).toHaveLength(1);
    const c = await umaConta('candidato');
    expect(await db.select().from(perfis).where(eq(perfis.usuarioId, c.id))).toHaveLength(1);
  });
  it('e-mail repetido, mesmo com maiúsculas, não cria outra conta', async () => {
    const c = await umaConta();
    expect((await criarConta(db, { tipo: 'candidato', nome: 'Outra', email: ` ${c.email.toUpperCase()} `, telefone: '17988887777', senha: 'outrasenha1' })).ok).toBe(false);
  });
});

describe('link de acesso', () => {
  it('vale uma vez, confirma o e-mail e abre sessão', async () => {
    const c = await umaConta();
    const r = await pedirLink(db, c.email, '/candidato/perfil');
    expect(r.ok && r.token).toBeTruthy();
    const token = (r as { token: string }).token;
    expect(await linkValido(db, token)).toBe(true);
    const uso = await usarLink(db, token);
    expect(uso).toMatchObject({ destino: '/candidato/perfil', tipo: 'candidato' });
    expect((await usuarioDaSessao(db, uso!.sessao))?.confirmado).toBe(true);
    expect(await linkValido(db, token)).toBe(false);
    expect(await usarLink(db, token)).toBeNull();
  });
  it('expira em 1 hora', async () => {
    const c = await umaConta();
    const t0 = new Date();
    const r = await pedirLink(db, c.email, '/', false, t0);
    const token = (r as { token: string }).token;
    expect(await linkValido(db, token, new Date(t0.getTime() + LINK_MS + 1000))).toBe(false);
    expect(await usarLink(db, token, new Date(t0.getTime() + LINK_MS + 1000))).toBeNull();
  });
  it('e-mail desconhecido responde igual, sem token', async () => {
    expect(await pedirLink(db, 'ninguem@exemplo.com.br', '/')).toEqual({ ok: true });
  });
  it('mais de 5 pedidos em 15 minutos são barrados', async () => {
    const c = await umaConta();
    const t0 = new Date();
    for (let i = 0; i < 5; i += 1) expect((await pedirLink(db, c.email, '/', false, new Date(t0.getTime() + i))).ok).toBe(true);
    expect((await pedirLink(db, c.email, '/', false, new Date(t0.getTime() + 10))).ok).toBe(false);
    expect((await pedirLink(db, c.email, '/', false, new Date(t0.getTime() + 16 * 60 * 1000))).ok).toBe(true);
  });
  it('destino de fora do site vira o padrão', async () => {
    const c = await umaConta();
    const r = await pedirLink(db, c.email, '//golpe.com/entrar');
    expect((await usarLink(db, (r as { token: string }).token))?.destino).toBe('/');
  });
  it('quem confirma pelo link de entrar derruba a senha e as sessões criadas antes da prova', async () => {
    const c = await umaConta();
    const doImpostor = await abrirSessao(db, c.id);
    const r = await pedirLink(db, c.email, '/', false);
    await usarLink(db, (r as { token: string }).token);
    expect(await usuarioDaSessao(db, doImpostor)).toBeNull();
    expect(await temSenha(db, c.id)).toBe(false);
  });
  it('o link de confirmação do cadastro mantém a senha e a sessão', async () => {
    const c = await umaConta();
    const minha = await abrirSessao(db, c.id);
    const r = await pedirLink(db, c.email, '/candidato', true);
    await usarLink(db, (r as { token: string }).token);
    expect(await usuarioDaSessao(db, minha)).not.toBeNull();
    expect(await temSenha(db, c.id)).toBe(true);
  });
});

describe('senha e sessão', () => {
  it('senha só entra com e-mail confirmado', async () => {
    const c = await umaConta();
    expect(await entrarComSenha(db, c.email, 'senhaforte123')).toMatchObject({ ok: false, erro: expect.stringContaining('Confirme seu e-mail') });
    await db.update(usuarios).set({ emailConfirmadoEm: new Date() }).where(eq(usuarios.id, c.id));
    expect(await entrarComSenha(db, c.email.toUpperCase(), 'senhaforte123')).toMatchObject({ ok: true, tipo: 'candidato' });
  });
  it('senha errada e conta inexistente dão a mesma resposta', async () => {
    const c = await umaConta('candidato', true);
    const errada = await entrarComSenha(db, c.email, 'senhaerrada1');
    const inexistente = await entrarComSenha(db, 'nao-existe@exemplo.com.br', 'senhaerrada1');
    expect(errada).toEqual({ ok: false, erro: 'E-mail ou senha incorretos.' });
    expect(inexistente).toEqual(errada);
  });
  it('tentativas de senha têm limite', async () => {
    const c = await umaConta('candidato', true);
    for (let i = 0; i < 10; i += 1) await entrarComSenha(db, c.email, 'senhaerrada1');
    expect(await entrarComSenha(db, c.email, 'senhaforte123')).toMatchObject({ ok: false, erro: expect.stringContaining('Muitas tentativas') });
  });
  it('sessão expira e sair encerra', async () => {
    const e = await umaConta('contratante', true);
    const t0 = new Date();
    const s = await abrirSessao(db, e.id, t0);
    const u = await usuarioDaSessao(db, s, t0);
    expect(u).toMatchObject({ id: e.id, tipo: 'contratante', confirmado: true });
    expect(u?.empresaId).toBeTruthy();
    expect(await usuarioDaSessao(db, s, new Date(t0.getTime() + (SESSAO_DIAS + 1) * 86_400_000))).toBeNull();
    await encerrarSessao(db, s);
    expect(await usuarioDaSessao(db, s, t0)).toBeNull();
  });
  it('token malformado não chega ao banco', async () => {
    expect(await usuarioDaSessao(db, "x' or 1=1 --")).toBeNull();
    expect(await linkValido(db, '')).toBe(false);
  });
  it('trocar a senha encerra as outras sessões e mantém a atual', async () => {
    const c = await umaConta('candidato', true);
    const atual = await abrirSessao(db, c.id);
    const outra = await abrirSessao(db, c.id);
    await definirSenha(db, c.id, 'novasenha123', atual);
    expect(await usuarioDaSessao(db, atual)).not.toBeNull();
    expect(await usuarioDaSessao(db, outra)).toBeNull();
    expect((await db.select().from(sessoes).where(eq(sessoes.usuarioId, c.id))).length).toBe(1);
    expect((await entrarComSenha(db, c.email, 'novasenha123')).ok).toBe(true);
  });
});

describe('limites e destinos', () => {
  it('janela deslizante', async () => {
    const t0 = new Date();
    for (let i = 0; i < 3; i += 1) expect(await dentroDoLimite(db, 'teste:a', 3, 1000, new Date(t0.getTime() + i))).toBe(true);
    expect(await dentroDoLimite(db, 'teste:a', 3, 1000, new Date(t0.getTime() + 5))).toBe(false);
    expect(await dentroDoLimite(db, 'teste:a', 3, 1000, new Date(t0.getTime() + 2000))).toBe(true);
  });
  it('faxina apaga sessões e links vencidos e tentativas velhas, e mantém o que vale', async () => {
    const c = await umaConta('candidato', true);
    const t0 = new Date();
    const velha = await abrirSessao(db, c.id, new Date(t0.getTime() - (SESSAO_DIAS + 1) * 86_400_000));
    const atual = await abrirSessao(db, c.id, t0);
    await dentroDoLimite(db, 'teste:faxina', 5, 1000, new Date(t0.getTime() - 2 * 86_400_000));
    await limparVencidos(db, t0);
    const restantes = (await db.select().from(sessoes).where(eq(sessoes.usuarioId, c.id))).length;
    expect(restantes).toBe(1);
    expect(await usuarioDaSessao(db, atual, t0)).not.toBeNull();
    expect(await usuarioDaSessao(db, velha, t0)).toBeNull();
    expect((await db.select().from(tentativas).where(eq(tentativas.chave, 'teste:faxina'))).length).toBe(0);
  });
  it('só aceita caminhos do próprio site', () => {
    expect(destinoSeguro('/vagas?q=a', '/x')).toBe('/vagas?q=a');
    for (const ruim of ['https://golpe.com', '//golpe.com', '/\\golpe.com', 'vagas', '', undefined, '/a b']) expect(destinoSeguro(ruim, '/x')).toBe('/x');
  });
});
