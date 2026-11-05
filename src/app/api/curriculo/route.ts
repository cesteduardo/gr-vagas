import { NextResponse } from 'next/server';
import { dentroDoLimite } from '@/lib/auth/contas';
import { usuarioAtual } from '@/lib/auth/sessao';
import { banco } from '@/lib/db/client';
import { cvDoTexto } from '@/lib/curriculo';
import { textoDoPdf } from '@/lib/ia/curriculo';
import { guardarCurriculo, MAX_CURRICULO } from '@/lib/perfis';

export async function POST(req: Request) {
  const u = await usuarioAtual();
  if (u?.tipo !== 'candidato') return NextResponse.json({ erro: 'Entre na sua conta de candidato.' }, { status: 401 });
  if (!(await dentroDoLimite(await banco(), `curriculo:u:${u.id}`, 20, 60 * 60 * 1000))) return NextResponse.json({ erro: 'Muitos envios em pouco tempo. Tente de novo mais tarde.' }, { status: 429 });
  const arquivo = (await req.formData()).get('arquivo');
  if (!(arquivo instanceof File)) return NextResponse.json({ erro: 'Escolha um arquivo.' }, { status: 400 });
  if (arquivo.size > MAX_CURRICULO) return NextResponse.json({ erro: 'O arquivo passa de 3 MB.' }, { status: 400 });
  const b = Buffer.from(await arquivo.arrayBuffer());
  const erro = await guardarCurriculo(await banco(), u.id, arquivo.name, b);
  if (erro) return NextResponse.json({ erro }, { status: 400 });
  // Devolve o que deu para ler: a pessoa escolhe se quer preencher o perfil com isso.
  return NextResponse.json({ nome: arquivo.name, cv: cvDoTexto(await textoDoPdf(b)) });
}
