import type { Metadata } from 'next';
import Link from 'next/link';
import { CaixaConversas } from '@/components/caixa-conversas';
import { exigirContratante } from '@/lib/auth/sessao';
import { caixaDeEntrada } from '@/lib/candidaturas';
import { banco } from '@/lib/db/client';

export const metadata: Metadata = { title: 'Conversas' };

export default async function ConversasEmpresa() {
  const u = await exigirContratante();
  const itens = await caixaDeEntrada(await banco(), u.id, 'empresa');
  return (
    <>
      <h1 className="titulo-painel">Conversas</h1>
      <CaixaConversas itens={itens} vazio={<><p>Quando alguém se candidatar a uma vaga sua, a conversa aparece aqui.</p><Link className="btn btn-claro btn-peq" href="/publicar">Publicar vaga</Link></>} />
    </>
  );
}
