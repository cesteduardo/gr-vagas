import { BASE } from '@/lib/base';
import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { usuarioAtual } from '@/lib/auth/sessao';
import { banco } from '@/lib/db/client';
import { empresas } from '@/lib/db/schema';
import { lerImagemEnviada } from '@/lib/imagem-enviada';

const MAX = 3 * 1024 * 1024;

export async function POST(req: Request) {
  const u = await usuarioAtual();
  if (!u?.empresaId) return NextResponse.json({ erro: 'Entre na sua conta para enviar a capa.' }, { status: 401 });
  const img = await lerImagemEnviada(req, MAX, 'A capa');
  if (img instanceof NextResponse) return img;
  await (await banco()).update(empresas).set({ capa: img.b, capaMime: img.mime }).where(eq(empresas.id, u.empresaId));
  return NextResponse.json({ url: `${BASE}/api/capa/${u.empresaId}?v=${Date.now()}` });
}

export async function DELETE() {
  const u = await usuarioAtual();
  if (!u?.empresaId) return NextResponse.json({ erro: 'Entre na sua conta.' }, { status: 401 });
  await (await banco()).update(empresas).set({ capa: null, capaMime: null }).where(eq(empresas.id, u.empresaId));
  return NextResponse.json({ ok: true });
}
