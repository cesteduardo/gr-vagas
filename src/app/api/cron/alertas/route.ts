import { NextResponse } from 'next/server';
import { banco } from '@/lib/db/client';
import { enviarAlertas } from '@/lib/perfis';

// Chamar de hora em hora, com o cabeçalho Authorization: Bearer <CRON_SEGREDO>.
export async function POST(req: Request) {
  const segredo = process.env.CRON_SEGREDO;
  if (!segredo || req.headers.get('authorization') !== `Bearer ${segredo}`) return NextResponse.json({ erro: 'Não autorizado.' }, { status: 401 });
  return NextResponse.json({ enviados: await enviarAlertas(await banco()) });
}
