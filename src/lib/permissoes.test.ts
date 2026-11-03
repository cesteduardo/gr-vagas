import { beforeAll, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import type { Banco } from '@/lib/db/client';
import { perfis, usuarios } from '@/lib/db/schema';
import { acessoCandidatura, candidatarSemConta, candidaturasDaVaga, conversa, enviarMensagem, mudarEtapa } from '@/lib/candidaturas';
import { curriculoParaBaixar, guardarCurriculo, salvarPerfil } from '@/lib/perfis';
import { assinar } from '@/lib/planos';
import { bancoEmMemoria, umaEmpresa } from '@/lib/teste-apoio';
import { editarVaga, guardarImagemVaga, mudarEstadoVaga, salvarArte, vagaDaEmpresa } from '@/lib/vagas';
import { umaVaga } from '@/lib/teste-apoio';

let db: Banco;
let dona: Awaited<ReturnType<typeof umaEmpresa>>;
let outra: Awaited<ReturnType<typeof umaEmpresa>>;
let candidatoId: string;
let intrusoId: string;
let candidaturaId: string;

beforeAll(async () => {
  db = await bancoEmMemoria();
  dona = await umaEmpresa(db);
  outra = await umaEmpresa(db);
  const r = await candidatarSemConta(db, { nome: 'Bruno', email: 'b@exemplo.com', telefone: '17988887777', vagaId: dona.vagaId });
  if (!r.ok) throw new Error(r.erro);
  candidaturaId = r.candidaturaId;
  candidatoId = (await db.select().from(usuarios).where(eq(usuarios.email, 'b@exemplo.com')))[0]!.id;
  const i = await candidatarSemConta(db, { nome: 'Intruso', email: 'i@exemplo.com', telefone: '17988887776', vagaId: outra.vagaId });
  if (!i.ok) throw new Error(i.erro);
  intrusoId = (await db.select().from(usuarios).where(eq(usuarios.email, 'i@exemplo.com')))[0]!.id;
  await guardarCurriculo(db, candidatoId, 'cv.pdf', Buffer.from('%PDF-1.4 x'));
});

describe('conversa e candidatura alheias não existem', () => {
  it('outra empresa', async () => {
    expect(await acessoCandidatura(db, candidaturaId, outra.usuarioId)).toBeNull();
    expect(await conversa(db, candidaturaId, outra.usuarioId)).toBeNull();
    expect(await mudarEtapa(db, candidaturaId, outra.usuarioId, 'contratado')).toBe(false);
    expect(await enviarMensagem(db, { candidaturaId, autorId: outra.usuarioId, texto: 'oi' })).toEqual({ ok: false, erro: 'Conversa não encontrada.' });
    expect(await candidaturasDaVaga(db, outra.empresaId, dona.vagaId, outra.usuarioId)).toEqual([]);
  });
  it('outro candidato', async () => {
    expect(await acessoCandidatura(db, candidaturaId, intrusoId)).toBeNull();
    expect(await conversa(db, candidaturaId, intrusoId)).toBeNull();
  });
  it('candidato não muda a própria etapa', async () => {
    expect(await mudarEtapa(db, candidaturaId, candidatoId, 'contratado')).toBe(false);
  });
  it('id malformado', async () => {
    expect(await acessoCandidatura(db, "x' or 1=1", dona.usuarioId)).toBeNull();
  });
});

describe('currículo', () => {
  it('dono, candidato e empresa da candidatura baixam; demais não', async () => {
    expect(await curriculoParaBaixar(db, candidatoId, candidatoId)).not.toBeNull();
    expect(await curriculoParaBaixar(db, dona.usuarioId, candidatoId, candidaturaId)).not.toBeNull();
    expect(await curriculoParaBaixar(db, outra.usuarioId, candidatoId, candidaturaId)).toBeNull();
    expect(await curriculoParaBaixar(db, outra.usuarioId, candidatoId)).toBeNull();
    expect(await curriculoParaBaixar(db, intrusoId, candidatoId)).toBeNull();
    expect(await curriculoParaBaixar(db, dona.usuarioId, candidatoId)).toBeNull();
  });
  it('banco de talentos exige plano e aceite', async () => {
    const e = await umaEmpresa(db);
    await assinar(db, e.usuarioId, 'profissional');
    expect(await curriculoParaBaixar(db, e.usuarioId, candidatoId)).toBeNull();
    await salvarPerfil(db, candidatoId, { titulo: 'x', cidadeSlug: 'mirassol', resumo: 'y', aceiteTalentos: true });
    expect(await curriculoParaBaixar(db, e.usuarioId, candidatoId)).not.toBeNull();
    await salvarPerfil(db, candidatoId, { titulo: 'x', cidadeSlug: 'mirassol', resumo: 'y', aceiteTalentos: false });
    expect(await curriculoParaBaixar(db, e.usuarioId, candidatoId)).toBeNull();
    const [p] = await db.select().from(perfis).where(eq(perfis.usuarioId, candidatoId));
    expect(p!.aceiteTalentosEm).toBeNull();
  });
});

describe('vaga alheia', () => {
  it('não edita, não muda estado, não lê, não altera arte', async () => {
    expect(await editarVaga(db, outra.empresaId, dona.vagaId, umaVaga({ titulo: 'Invadida' }))).toBe(false);
    expect((await mudarEstadoVaga(db, outra.usuarioId, outra.empresaId, dona.vagaId, 'encerrada')).ok).toBe(false);
    expect(await vagaDaEmpresa(db, outra.empresaId, dona.vagaId)).toBeNull();
    expect(await guardarImagemVaga(db, outra.empresaId, dona.vagaId, Buffer.from('x'), 'image/png')).toBe(false);
    expect(await salvarArte(db, outra.empresaId, dona.vagaId, { modelo: 'poster' })).toBeNull();
  });
});
