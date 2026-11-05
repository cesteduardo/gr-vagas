import { headers } from 'next/headers';
import { ipDe } from '@/lib/ip';
import { NextResponse } from 'next/server';
import { dentroDoLimite } from '@/lib/auth/contas';
import { banco } from '@/lib/db/client';
import { lerVaga } from '@/lib/ia/vaga';

export async function POST(req: Request) {
  const ip = ipDe(await headers());
  if (!(await dentroDoLimite(await banco(), `leitura-vaga:${ip}`, 20, 60 * 60 * 1000))) return NextResponse.json({ erro: 'Muitas leituras em pouco tempo. Tente de novo mais tarde.' }, { status: 429 });
  const corpo = (await req.json().catch(() => null)) as { texto?: unknown } | null;
  const texto = typeof corpo?.texto === 'string' ? corpo.texto.trim() : '';
  if (texto.length < 10) return NextResponse.json({ erro: 'Cole o texto da vaga.' }, { status: 400 });
  return NextResponse.json({ vaga: await lerVaga(texto.slice(0, 8000)) }, { headers: { 'Cache-Control': 'no-store' } });
}
