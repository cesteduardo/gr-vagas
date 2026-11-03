import { eq } from 'drizzle-orm';
import { banco } from '@/lib/db/client';
import { empresas } from '@/lib/db/schema';
import { respostaImagem } from '@/lib/imagem-enviada';

export async function GET(_: Request, { params }: { params: Promise<{ empresaId: string }> }) {
  const { empresaId } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(empresaId)) return new Response(null, { status: 404 });
  const [e] = await (await banco()).select({ capa: empresas.capa, mime: empresas.capaMime }).from(empresas).where(eq(empresas.id, empresaId));
  if (!e?.capa || !e.mime) return new Response(null, { status: 404 });
  return respostaImagem(e.capa, e.mime, 'public, max-age=300');
}
