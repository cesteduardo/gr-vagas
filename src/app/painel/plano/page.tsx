import type { Metadata } from 'next';
import { PlanoTela } from '@/components/plano-tela';
import { exigirContratante } from '@/lib/auth/sessao';
import { banco } from '@/lib/db/client';
import { assinaturaDe, planoDe } from '@/lib/planos';
import { rotuloEstado, vagasDaEmpresa } from '@/lib/vagas';

export const metadata: Metadata = { title: 'Plano' };

export default async function Plano({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const u = await exigirContratante();
  const s = await searchParams;
  const db = await banco();
  const abertas = (await vagasDaEmpresa(db, u.empresaId)).filter((v) => rotuloEstado(v.estado, v.expiraEm) === 'Aberta');
  const uso = { abertas: abertas.length, destaques: abertas.filter((v) => v.destaque).length };
  return (
    <>
      <h1 className="titulo-painel" style={{ marginBottom: 20 }}>Plano</h1>
      <PlanoTela tipo="contratante" plano={await planoDe(db, u.id)} assinatura={await assinaturaDe(db, u.id)} uso={uso} erro={s.erro?.slice(0, 200)} ok={s.ok === '1'} pago={s.pago === '1'} />
    </>
  );
}
