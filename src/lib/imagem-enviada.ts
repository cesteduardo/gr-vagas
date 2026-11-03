import { NextResponse } from 'next/server';
import { tipoReal } from '@/lib/imagem';

const mb = (n: number) => `${Math.round(n / (1024 * 1024))} MB`;

// Lê a imagem de um formulário: confere tamanho e o tipo pelo conteúdo, não pelo nome.
export async function lerImagemEnviada(req: Request, max: number, oQue: string): Promise<{ b: Buffer; mime: string } | NextResponse> {
  const arquivo = (await req.formData()).get('arquivo');
  if (!(arquivo instanceof File)) return NextResponse.json({ erro: 'Escolha um arquivo.' }, { status: 400 });
  if (arquivo.size > max) return NextResponse.json({ erro: `${oQue} passa de ${mb(max)}.` }, { status: 400 });
  const b = Buffer.from(await arquivo.arrayBuffer());
  const mime = tipoReal(b);
  if (!mime) return NextResponse.json({ erro: `Envie ${oQue.toLowerCase()} em PNG, JPG ou WebP.` }, { status: 400 });
  return { b, mime };
}

export function respostaImagem(b: Buffer, mime: string, cache: string) {
  return new Response(new Uint8Array(b), { headers: { 'Content-Type': mime, 'Cache-Control': cache, 'Content-Security-Policy': "default-src 'none'" } });
}
