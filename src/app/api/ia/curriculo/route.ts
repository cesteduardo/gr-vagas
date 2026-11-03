import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { dentroDoLimite } from '@/lib/auth/contas';
import { banco } from '@/lib/db/client';
import { lerCurriculo } from '@/lib/ia/curriculo';
import { MAX_CURRICULO, validarPdf } from '@/lib/perfis';
import { formatarSalario } from '@/lib/texto';
import { vagasQueCombinam } from '@/lib/vagas';

// Lê e devolve. Nada fica guardado até a pessoa se candidatar.
export async function POST(req: Request) {
  const db = await banco();
  const ip = (await headers()).get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'local';
  if (!(await dentroDoLimite(db, `leitura:${ip}`, 20, 60 * 60 * 1000))) return NextResponse.json({ erro: 'Muitas leituras em pouco tempo. Tente de novo mais tarde.' }, { status: 429 });
  const arquivo = (await req.formData()).get('arquivo');
  if (!(arquivo instanceof File)) return NextResponse.json({ erro: 'Escolha o seu currículo em PDF.' }, { status: 400 });
  if (arquivo.size > MAX_CURRICULO) return NextResponse.json({ erro: 'O arquivo passa de 3 MB.' }, { status: 400 });
  const b = Buffer.from(await arquivo.arrayBuffer());
  const erro = validarPdf(b);
  if (erro) return NextResponse.json({ erro }, { status: 400 });
  const { dados, texto } = await lerCurriculo(b);
  const lista = await vagasQueCombinam(db, { titulo: dados.titulo, texto, cidadeSlug: dados.cidadeSlug });
  return NextResponse.json(
    { dados, vagas: lista.map((v) => ({ id: v.id, slug: v.slug, titulo: v.titulo, empresa: v.empresaNome, cidade: v.cidade, contrato: v.contrato, salario: formatarSalario(v.salarioCentavos) })) },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
