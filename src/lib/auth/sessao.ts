import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import { banco } from '@/lib/db/client';
import { destinoSeguro, encerrarSessao, SESSAO_DIAS, usuarioDaSessao, type UsuarioSessao } from './contas';

// Cookies, sessão e guardas das telas. As regras ficam em contas.ts.
export const COOKIE_SESSAO = 'sessao';

// Em produção o cookie só viaja por HTTPS. COOKIE_INSEGURO=1 só para testar o build local em http.
const cookieSeguro = () => process.env.NODE_ENV === 'production' && process.env.COOKIE_INSEGURO !== '1';

export type Usuario = UsuarioSessao;

// Uma consulta por requisição, mesmo com topo, layout e página pedindo o usuário.
export const usuarioAtual = cache(async (): Promise<Usuario | null> => {
  const token = (await cookies()).get(COOKIE_SESSAO)?.value;
  if (!token) return null;
  return usuarioDaSessao(await banco(), token);
});

export async function gravarCookieSessao(token: string): Promise<void> {
  (await cookies()).set(COOKIE_SESSAO, token, { httpOnly: true, sameSite: 'lax', secure: cookieSeguro(), path: '/', maxAge: SESSAO_DIAS * 24 * 60 * 60 });
}

export async function sairDaSessao(): Promise<void> {
  const c = await cookies();
  await encerrarSessao(await banco(), c.get(COOKIE_SESSAO)?.value);
  c.delete(COOKIE_SESSAO);
}

// O proxy grava o caminho pedido em x-caminho, para voltar a ele depois de entrar.
async function paraEntrar(): Promise<never> {
  const caminho = destinoSeguro((await headers()).get('x-caminho'), '');
  redirect(caminho ? `/entrar?destino=${encodeURIComponent(caminho)}` : '/entrar');
}

export async function exigirUsuario(): Promise<Usuario> {
  const u = await usuarioAtual();
  if (!u) await paraEntrar();
  return u!;
}

export async function exigirContratante(): Promise<Usuario & { tipo: 'contratante'; empresaId: string }> {
  const u = await exigirUsuario();
  if (u.tipo !== 'contratante' || !u.empresaId) redirect('/candidato');
  return u as Usuario & { tipo: 'contratante'; empresaId: string };
}

export async function exigirCandidato(): Promise<Usuario & { tipo: 'candidato' }> {
  const u = await exigirUsuario();
  if (u.tipo !== 'candidato') redirect('/painel');
  return u as Usuario & { tipo: 'candidato' };
}

const emailsAdmin = () => (process.env.ADMIN_EMAILS ?? '').split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);

// Exige e-mail confirmado: sem isso, quem cadastrasse primeiro o e-mail do moderador viraria moderador.
export async function exigirAdmin(): Promise<Usuario> {
  const u = await exigirUsuario();
  if (!u.confirmado || !emailsAdmin().includes(u.email)) redirect('/');
  return u;
}
