import { createHash, randomBytes } from 'node:crypto';
import { and, count, eq, gt, isNull, lt, ne } from 'drizzle-orm';
import type { Banco } from '@/lib/db/client';
import { empresas, linksAcesso, perfis, sessoes, tentativas, usuarios } from '@/lib/db/schema';
import { paraSlug } from '@/lib/texto';
import { conferirSenha, hashSenha } from './senha';

export const SESSAO_DIAS = 30;
const DIA_MS = 24 * 60 * 60 * 1000;
export const LINK_MS = 60 * 60 * 1000;
const JANELA_MS = 15 * 60 * 1000;
const MAX_LINKS = 5;
const MAX_SENHAS = 10;

export type Tipo = 'contratante' | 'candidato';

// O banco guarda só o hash: quem lê o banco não consegue usar a sessão nem o link.
export const novoToken = () => randomBytes(32).toString('base64url');
export const hashToken = (t: string) => createHash('sha256').update(t).digest('hex');
const tokenBemFormado = (t: unknown): t is string => typeof t === 'string' && /^[A-Za-z0-9_-]{20,100}$/.test(t);
const limparEmail = (e: string) => e.trim().toLowerCase();

// Só caminhos do próprio site. "//outro.com" e "/\outro.com" levariam para fora.
export function destinoSeguro(destino: string | null | undefined, padrao: string): string {
  const d = String(destino ?? '').trim();
  if (!d.startsWith('/') || d.startsWith('//') || /[\\\s]/.test(d) || d.length > 500) return padrao;
  return d;
}

// Conta a tentativa e diz se ainda cabe na janela. Serve para links, senha, denúncias e leituras.
export async function dentroDoLimite(db: Banco, chave: string, maximo: number, janelaMs: number, agora = new Date()): Promise<boolean> {
  const desde = new Date(agora.getTime() - janelaMs);
  await db.delete(tentativas).where(and(eq(tentativas.chave, chave), lt(tentativas.criadoEm, desde)));
  const [r] = await db.select({ total: count() }).from(tentativas).where(and(eq(tentativas.chave, chave), gt(tentativas.criadoEm, desde)));
  if ((r?.total ?? 0) >= maximo) return false;
  await db.insert(tentativas).values({ chave, criadoEm: agora });
  return true;
}

export async function abrirSessao(db: Banco, usuarioId: string, agora = new Date()): Promise<string> {
  const token = novoToken();
  await db.delete(sessoes).where(and(eq(sessoes.usuarioId, usuarioId), lt(sessoes.expiraEm, agora)));
  await db.insert(sessoes).values({ tokenHash: hashToken(token), usuarioId, expiraEm: new Date(agora.getTime() + SESSAO_DIAS * DIA_MS) });
  return token;
}

export type UsuarioSessao = { id: string; nome: string; email: string; telefone: string; tipo: Tipo; confirmado: boolean; empresaId: string | null };

export async function usuarioDaSessao(db: Banco, token: string | undefined, agora = new Date()): Promise<UsuarioSessao | null> {
  if (!tokenBemFormado(token)) return null;
  const [l] = await db
    .select({ id: usuarios.id, nome: usuarios.nome, email: usuarios.email, telefone: usuarios.telefone, tipo: usuarios.tipo, confirmadoEm: usuarios.emailConfirmadoEm, empresaId: empresas.id })
    .from(sessoes)
    .innerJoin(usuarios, eq(usuarios.id, sessoes.usuarioId))
    .leftJoin(empresas, eq(empresas.donoId, usuarios.id))
    .where(and(eq(sessoes.tokenHash, hashToken(token)), gt(sessoes.expiraEm, agora)));
  if (!l) return null;
  const { confirmadoEm, ...resto } = l;
  return { ...resto, confirmado: confirmadoEm !== null };
}

export async function encerrarSessao(db: Banco, token: string | undefined): Promise<void> {
  if (tokenBemFormado(token)) await db.delete(sessoes).where(eq(sessoes.tokenHash, hashToken(token)));
}

export async function criarConta(
  db: Banco,
  d: { tipo: Tipo; nome: string; email: string; telefone: string; senha: string; empresa?: string },
): Promise<{ ok: true; usuarioId: string } | { ok: false; usuarioId?: undefined }> {
  const senhaHash = await hashSenha(d.senha);
  const id = await db.transaction(async (tx) => {
    const [u] = await tx.insert(usuarios).values({ nome: d.nome.trim(), email: limparEmail(d.email), telefone: d.telefone, tipo: d.tipo, senhaHash }).onConflictDoNothing().returning({ id: usuarios.id });
    if (!u) return null;
    if (d.tipo === 'contratante') {
      const nome = d.empresa?.trim() || d.nome.trim();
      await tx.insert(empresas).values({ donoId: u.id, nome, slug: `${paraSlug(nome) || 'empresa'}-${randomBytes(3).toString('hex')}` });
    } else {
      await tx.insert(perfis).values({ usuarioId: u.id }).onConflictDoNothing();
    }
    return u.id;
  });
  return id ? { ok: true, usuarioId: id } : { ok: false };
}

// Sempre responde igual para e-mail com ou sem conta: só quem tem conta recebe o token.
export async function pedirLink(db: Banco, email: string, destino: string, confirmaSenha = false, agora = new Date()): Promise<{ ok: false } | { ok: true; token?: string }> {
  const e = limparEmail(email);
  if (!(await dentroDoLimite(db, `link:${e}`, MAX_LINKS, JANELA_MS, agora))) return { ok: false };
  const [u] = await db.select({ id: usuarios.id }).from(usuarios).where(eq(usuarios.email, e));
  if (!u) return { ok: true };
  const token = novoToken();
  await db.delete(linksAcesso).where(and(eq(linksAcesso.usuarioId, u.id), lt(linksAcesso.expiraEm, agora)));
  await db.insert(linksAcesso).values({ tokenHash: hashToken(token), usuarioId: u.id, destino: destinoSeguro(destino, '/'), confirmaSenha, expiraEm: new Date(agora.getTime() + LINK_MS) });
  return { ok: true, token };
}

export async function linkValido(db: Banco, token: string, agora = new Date()): Promise<boolean> {
  if (!tokenBemFormado(token)) return false;
  const [l] = await db.select({ u: linksAcesso.usuarioId }).from(linksAcesso).where(and(eq(linksAcesso.tokenHash, hashToken(token)), isNull(linksAcesso.usadoEm), gt(linksAcesso.expiraEm, agora)));
  return Boolean(l);
}

// Usar o link prova que a pessoa é dona do e-mail. Se a conta ainda não tinha e-mail
// confirmado e o link não é o de confirmação do cadastro, a senha e as sessões abertas
// antes dessa prova são descartadas: alguém pode ter criado a conta com o e-mail de outra pessoa.
export async function usarLink(db: Banco, token: string, agora = new Date()): Promise<{ sessao: string; destino: string; tipo: Tipo } | null> {
  if (!tokenBemFormado(token)) return null;
  const [l] = await db
    .update(linksAcesso)
    .set({ usadoEm: agora })
    .where(and(eq(linksAcesso.tokenHash, hashToken(token)), isNull(linksAcesso.usadoEm), gt(linksAcesso.expiraEm, agora)))
    .returning({ usuarioId: linksAcesso.usuarioId, destino: linksAcesso.destino, confirmaSenha: linksAcesso.confirmaSenha });
  if (!l) return null;
  const [u] = await db.select({ tipo: usuarios.tipo, confirmadoEm: usuarios.emailConfirmadoEm }).from(usuarios).where(eq(usuarios.id, l.usuarioId));
  if (!u) return null;
  if (!u.confirmadoEm) {
    await db.update(usuarios).set({ emailConfirmadoEm: agora, ...(l.confirmaSenha ? {} : { senhaHash: null }) }).where(eq(usuarios.id, l.usuarioId));
    if (!l.confirmaSenha) await db.delete(sessoes).where(eq(sessoes.usuarioId, l.usuarioId));
  }
  return { sessao: await abrirSessao(db, l.usuarioId, agora), destino: destinoSeguro(l.destino, '/'), tipo: u.tipo };
}

export async function entrarComSenha(db: Banco, email: string, senha: string, agora = new Date()): Promise<{ ok: true; sessao: string; tipo: Tipo } | { ok: false; erro: string }> {
  const e = limparEmail(email);
  if (!(await dentroDoLimite(db, `senha:${e}`, MAX_SENHAS, JANELA_MS, agora))) return { ok: false, erro: 'Muitas tentativas. Aguarde 15 minutos ou entre pelo link do e-mail.' };
  const [u] = await db.select({ id: usuarios.id, tipo: usuarios.tipo, senhaHash: usuarios.senhaHash, confirmadoEm: usuarios.emailConfirmadoEm }).from(usuarios).where(eq(usuarios.email, e));
  if (!(await conferirSenha(senha, u?.senhaHash)) || !u) return { ok: false, erro: 'E-mail ou senha incorretos.' };
  if (!u.confirmadoEm) return { ok: false, erro: 'Confirme seu e-mail para entrar com a senha. Use o link que enviamos ou peça um novo logo abaixo.' };
  return { ok: true, sessao: await abrirSessao(db, u.id, agora), tipo: u.tipo };
}

// Faxina periódica (rota do cron): sessões e links vencidos e tentativas com mais de um dia.
export async function limparVencidos(db: Banco, agora = new Date()): Promise<void> {
  await db.delete(sessoes).where(lt(sessoes.expiraEm, agora));
  await db.delete(linksAcesso).where(lt(linksAcesso.expiraEm, agora));
  await db.delete(tentativas).where(lt(tentativas.criadoEm, new Date(agora.getTime() - DIA_MS)));
}

export async function temSenha(db: Banco, usuarioId: string): Promise<boolean> {
  const [u] = await db.select({ h: usuarios.senhaHash }).from(usuarios).where(eq(usuarios.id, usuarioId));
  return Boolean(u?.h);
}

// Trocar a senha encerra as outras sessões; a do aparelho em uso continua.
export async function definirSenha(db: Banco, usuarioId: string, senha: string, sessaoAtual?: string): Promise<void> {
  await db.update(usuarios).set({ senhaHash: await hashSenha(senha) }).where(eq(usuarios.id, usuarioId));
  const manter = tokenBemFormado(sessaoAtual) ? ne(sessoes.tokenHash, hashToken(sessaoAtual)) : undefined;
  await db.delete(sessoes).where(and(eq(sessoes.usuarioId, usuarioId), manter));
}
