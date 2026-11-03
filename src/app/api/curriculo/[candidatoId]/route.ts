import { usuarioAtual } from '@/lib/auth/sessao';
import { banco } from '@/lib/db/client';
import { curriculoParaBaixar } from '@/lib/perfis';

export async function GET(req: Request, { params }: { params: Promise<{ candidatoId: string }> }) {
  const u = await usuarioAtual();
  const { candidatoId } = await params;
  const candidatura = new URL(req.url).searchParams.get('candidatura') ?? undefined;
  if (!u || !/^[0-9a-f-]{36}$/i.test(candidatoId)) return new Response(null, { status: 404 });
  const c = await curriculoParaBaixar(await banco(), u.id, candidatoId, candidatura);
  if (!c) return new Response(null, { status: 404 });
  const nome = encodeURIComponent(c.nome);
  return new Response(new Uint8Array(c.arquivo), { headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename*=UTF-8''${nome}`, 'Cache-Control': 'private, no-store', 'Content-Security-Policy': "default-src 'none'" } });
}
