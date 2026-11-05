import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Acesso } from '@/components/acesso';
import { Rodape, Topo } from '@/components/moldura';
import { destinoSeguro } from '@/lib/auth/contas';
import { usuarioAtual } from '@/lib/auth/sessao';
import { SIMULADOR } from '@/lib/config';
import { EntrarTeste, PainelEntrar } from '@/components/form-simples';

export const metadata: Metadata = { title: 'Entrar', robots: { index: false, follow: false } };

export default async function Entrar({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const destino = destinoSeguro((await searchParams).destino, '');
  const u = await usuarioAtual();
  if (u) redirect(destino || (u.tipo === 'contratante' ? '/painel' : '/candidato'));
  return (
    <>
      <Topo />
      <Acesso titulo="Que bom ter você" cinza="de volta." itens={['Suas candidaturas e conversas num lugar só', 'Vagas que combinam com o seu currículo', 'Para empresas: candidatos, artes e planos']}>
        <div className="acesso-cabeca">
          <h1>Entrar</h1>
          <p className="leve">Vale para quem procura emprego e para quem contrata.</p>
        </div>
        {SIMULADOR ? <EntrarTeste /> : null}
        <PainelEntrar destino={destino} />
        <p className="leve acesso-rodape">Ainda não tem conta? <Link href="/criar-conta">Criar conta</Link></p>
      </Acesso>
      <Rodape />
    </>
  );
}
