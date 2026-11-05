import { NextResponse } from 'next/server';
import { dentroDoLimite } from '@/lib/auth/contas';
import { usuarioAtual } from '@/lib/auth/sessao';
import { banco } from '@/lib/db/client';
import { aplicarCurriculo } from '@/lib/perfil-do-curriculo';
import { guardarCurriculo, MAX_CURRICULO } from '@/lib/perfis';
import { vagasQueCombinam } from '@/lib/vagas';

export async function POST(req: Request) {
  const u = await usuarioAtual();
  if (u?.tipo !== 'candidato') return NextResponse.json({ erro: 'Entre na sua conta de candidato.' }, { status: 401 });
  if (!(await dentroDoLimite(await banco(), `curriculo:u:${u.id}`, 20, 60 * 60 * 1000))) return NextResponse.json({ erro: 'Muitos envios em pouco tempo. Tente de novo mais tarde.' }, { status: 429 });
  const arquivo = (await req.formData()).get('arquivo');
  if (!(arquivo instanceof File)) return NextResponse.json({ erro: 'Escolha um arquivo.' }, { status: 400 });
  if (arquivo.size > MAX_CURRICULO) return NextResponse.json({ erro: 'O arquivo passa de 3 MB.' }, { status: 400 });
  const b = Buffer.from(await arquivo.arrayBuffer());
  const db = await banco();
  const erro = await guardarCurriculo(db, u.id, arquivo.name, b);
  if (erro) return NextResponse.json({ erro }, { status: 400 });
  // O perfil já sai atualizado com o que o arquivo trouxe; devolve só o que entrou,
  // para o editor aberto somar ao que está na tela, e quantas vagas combinam agora.
  const { perfil, acrescimos } = await aplicarCurriculo(db, u.id, b);
  const combinam = (await vagasQueCombinam(db, { titulo: perfil.titulo, texto: perfil.resumo, cidadeSlug: perfil.cidadeSlug, cv: perfil.cv }, 50)).length;
  return NextResponse.json({ nome: arquivo.name, acrescimos, combinam }, { headers: { 'Cache-Control': 'no-store' } });
}
