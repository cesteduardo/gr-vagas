import { usuarioAtual } from '@/lib/auth/sessao';
import { banco } from '@/lib/db/client';
import { dadosDoUsuario } from '@/lib/perfis';

export async function GET() {
  const u = await usuarioAtual();
  if (!u) return new Response(null, { status: 401 });
  return new Response(JSON.stringify(await dadosDoUsuario(await banco(), u.id), null, 2), { headers: { 'Content-Type': 'application/json; charset=utf-8', 'Content-Disposition': 'attachment; filename="meus-dados-gr-vagas.json"', 'Cache-Control': 'private, no-store' } });
}
