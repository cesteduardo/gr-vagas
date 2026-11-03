import { NextResponse } from 'next/server';
import { usuarioAtual } from '@/lib/auth/sessao';
import { acessoCandidatura, conversa, marcarLida } from '@/lib/candidaturas';
import { banco } from '@/lib/db/client';

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const u = await usuarioAtual();
  const { id } = await params;
  if (!u) return NextResponse.json({ erro: 'Entre na sua conta.' }, { status: 401 });
  const db = await banco();
  const a = await acessoCandidatura(db, id, u.id);
  if (!a) return NextResponse.json({ erro: 'Conversa não encontrada.' }, { status: 404 });
  const mensagens = await conversa(db, id, u.id);
  await marcarLida(db, a);
  return NextResponse.json({ mensagens }, { headers: { 'Cache-Control': 'no-store' } });
}
