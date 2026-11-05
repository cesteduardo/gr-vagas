import type { Metadata } from 'next';
import Link from 'next/link';
import { CaixaConversas } from '@/components/caixa-conversas';
import { exigirCandidato } from '@/lib/auth/sessao';
import { caixaDeEntrada } from '@/lib/candidaturas';
import { banco } from '@/lib/db/client';

export const metadata: Metadata = { title: 'Conversas' };

export default async function ConversasCandidato() {
  const u = await exigirCandidato();
  const itens = await caixaDeEntrada(await banco(), u.id, 'candidato');
  return (
    <>
      <h1 className="titulo-painel">Conversas</h1>
      <CaixaConversas itens={itens} vazio={<><p>Quando você se candidatar, a conversa com a empresa aparece aqui.</p><Link className="btn btn-claro btn-peq" href="/vagas">Ver vagas</Link></>} />
    </>
  );
}
