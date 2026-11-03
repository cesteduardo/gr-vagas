import { eq } from 'drizzle-orm';
import { banco } from '@/lib/db/client';
import { empresas } from '@/lib/db/schema';

export async function GET(_: Request, { params }: { params: Promise<{ empresaId: string }> }) {
  const { empresaId } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(empresaId)) return new Response(null, { status: 404 });
  const [e] = await (await banco()).select({ logo: empresas.logo, mime: empresas.logoMime }).from(empresas).where(eq(empresas.id, empresaId));
  if (!e?.logo || !e.mime) return new Response(null, { status: 404 });
  return new Response(new Uint8Array(e.logo), { headers: { 'Content-Type': e.mime, 'Cache-Control': 'public, max-age=300', 'Content-Security-Policy': "default-src 'none'" } });
}
