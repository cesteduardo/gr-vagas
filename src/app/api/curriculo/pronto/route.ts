import { NextResponse } from 'next/server';
import { usuarioAtual } from '@/lib/auth/sessao';
import { gerarCurriculoPdf } from '@/lib/curriculo-pdf';
import { banco } from '@/lib/db/client';
import { perfilDe } from '@/lib/perfis';
import { limites, planoDe } from '@/lib/planos';

// Baixa o currículo pronto em PDF, gerado aqui no servidor (extra do Plus).
export async function GET() {
  const u = await usuarioAtual();
  if (u?.tipo !== 'candidato') return NextResponse.json({ erro: 'Entre na sua conta de candidato.' }, { status: 401 });
  const db = await banco();
  if (!limites(await planoDe(db, u.id)).plus) return NextResponse.json({ erro: 'O currículo pronto faz parte do plano Plus.' }, { status: 403 });
  const p = await perfilDe(db, u.id);
  const pdf = await gerarCurriculoPdf({ nome: u.nome, email: u.email, telefone: u.telefone, titulo: p.titulo, cidadeSlug: p.cidadeSlug, resumo: p.resumo, cv: p.cv ?? {} });
  const arquivo = `Currículo - ${u.nome}.pdf`;
  const ascii = arquivo.normalize('NFD').replace(/[^\x20-\x7e]/g, '').replace(/["\\]/g, '');
  return new Response(new Uint8Array(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(arquivo)}`,
      'Cache-Control': 'private, no-store',
    },
  });
}
