import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { usuarioAtual } from '@/lib/auth/sessao';
import { banco } from '@/lib/db/client';
import { empresas } from '@/lib/db/schema';
import { tipoReal } from '@/lib/imagem';

const MAX = 1024 * 1024;


export async function POST(req: Request) {
  const u = await usuarioAtual();
  if (!u?.empresaId) return NextResponse.json({ erro: 'Entre na sua conta para enviar o logo.' }, { status: 401 });
  const arquivo = (await req.formData()).get('arquivo');
  if (!(arquivo instanceof File)) return NextResponse.json({ erro: 'Escolha um arquivo.' }, { status: 400 });
  if (arquivo.size > MAX) return NextResponse.json({ erro: 'O logo passa de 1 MB.' }, { status: 400 });
  const b = Buffer.from(await arquivo.arrayBuffer());
  const mime = tipoReal(b);
  if (!mime) return NextResponse.json({ erro: 'Envie o logo em PNG, JPG ou WebP.' }, { status: 400 });
  await (await banco()).update(empresas).set({ logo: b, logoMime: mime }).where(eq(empresas.id, u.empresaId));
  return NextResponse.json({ url: `/api/logo/${u.empresaId}?v=${Date.now()}` });
}
