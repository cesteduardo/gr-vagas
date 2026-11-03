import type { Metadata } from 'next';
import { PlanoTela } from '@/components/plano-tela';
import { exigirCandidato } from '@/lib/auth/sessao';
import { banco } from '@/lib/db/client';
import { assinaturaDe, planoDe } from '@/lib/planos';

export const metadata: Metadata = { title: 'Plano' };

export default async function Plano({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const u = await exigirCandidato();
  const s = await searchParams;
  const db = await banco();
  return (
    <>
      <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3rem)', marginBottom: 10 }}>Plano</h1>
      <p className="leve" style={{ marginBottom: 20 }}>Pesquisar, se candidatar e conversar são sempre grátis. O Plus é opcional.</p>
      <PlanoTela tipo="candidato" plano={await planoDe(db, u.id)} assinatura={await assinaturaDe(db, u.id)} erro={s.erro?.slice(0, 200)} ok={s.ok === '1'} />
    </>
  );
}
