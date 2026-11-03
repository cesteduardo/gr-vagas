import { NextResponse } from 'next/server';
import { usuarioAtual } from '@/lib/auth/sessao';
import { banco } from '@/lib/db/client';
import { lerImagemEnviada } from '@/lib/imagem-enviada';
import { MAX_FOTO, salvarFoto } from '@/lib/perfis';

export async function POST(req: Request) {
  const u = await usuarioAtual();
  if (u?.tipo !== 'candidato') return NextResponse.json({ erro: 'Entre na sua conta para enviar a foto.' }, { status: 401 });
  const img = await lerImagemEnviada(req, MAX_FOTO, 'A foto');
  if (img instanceof NextResponse) return img;
  await salvarFoto(await banco(), u.id, img.b, img.mime);
  return NextResponse.json({ url: `/api/foto/${u.id}?v=${Date.now()}` });
}

export async function DELETE() {
  const u = await usuarioAtual();
  if (u?.tipo !== 'candidato') return NextResponse.json({ erro: 'Entre na sua conta.' }, { status: 401 });
  await salvarFoto(await banco(), u.id, null, null);
  return NextResponse.json({ ok: true });
}
