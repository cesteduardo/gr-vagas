import { BASE } from '@/lib/base';
import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { usuarioAtual } from '@/lib/auth/sessao';
import { banco } from '@/lib/db/client';
import { vagas } from '@/lib/db/schema';
import { tipoReal } from '@/lib/imagem';
import { guardarArtePropria } from '@/lib/vagas';

// Arte da vaga feita pela própria empresa: PNG, JPG ou WebP, até 8 MB.
const MAX = 8 * 1024 * 1024;
const uuid = /^[0-9a-f-]{36}$/i;
type C = { params: Promise<{ id: string }> };

export async function GET(req: Request, { params }: C) {
  const { id } = await params;
  if (!uuid.test(id)) return new Response(null, { status: 404 });
  const [v] = await (await banco()).select({ arte: vagas.artePropria, mime: vagas.artePropriaMime, slug: vagas.slug }).from(vagas).where(eq(vagas.id, id));
  if (!v?.arte || !v.mime) return new Response(null, { status: 404 });
  const baixar = new URL(req.url).searchParams.has('baixar');
  const extensao = v.mime === 'image/png' ? 'png' : v.mime === 'image/webp' ? 'webp' : 'jpg';
  return new Response(new Uint8Array(v.arte), {
    headers: {
      'Content-Type': v.mime,
      'Cache-Control': 'public, max-age=300',
      'Content-Security-Policy': "default-src 'none'",
      ...(baixar ? { 'Content-Disposition': `attachment; filename="${v.slug}-arte.${extensao}"` } : {}),
    },
  });
}

export async function POST(req: Request, { params }: C) {
  const u = await usuarioAtual();
  const { id } = await params;
  if (!u?.empresaId || !uuid.test(id)) return NextResponse.json({ erro: 'Entre na sua conta para enviar a arte.' }, { status: 401 });
  const arquivo = (await req.formData()).get('arquivo');
  if (!(arquivo instanceof File)) return NextResponse.json({ erro: 'Escolha um arquivo.' }, { status: 400 });
  if (arquivo.size > MAX) return NextResponse.json({ erro: 'A arte passa de 8 MB.' }, { status: 400 });
  const b = Buffer.from(await arquivo.arrayBuffer());
  const mime = tipoReal(b);
  if (!mime) return NextResponse.json({ erro: 'Envie a arte em PNG, JPG ou WebP.' }, { status: 400 });
  if (!(await guardarArtePropria(await banco(), u.empresaId, id, b, mime))) return NextResponse.json({ erro: 'Vaga não encontrada.' }, { status: 404 });
  return NextResponse.json({ url: `${BASE}/api/vagas/${id}/arte-propria?v=${Date.now()}` });
}

export async function DELETE(_: Request, { params }: C) {
  const u = await usuarioAtual();
  const { id } = await params;
  if (!u?.empresaId || !uuid.test(id)) return NextResponse.json({ erro: 'Entre na sua conta.' }, { status: 401 });
  await guardarArtePropria(await banco(), u.empresaId, id, null, null);
  return NextResponse.json({ ok: true });
}
