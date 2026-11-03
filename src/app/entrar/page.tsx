import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { FormEntrar, FormLink } from '@/components/form-simples';
import { Acesso } from '@/components/acesso';
import { Rodape, Topo } from '@/components/moldura';
import { destinoSeguro } from '@/lib/auth/contas';
import { usuarioAtual } from '@/lib/auth/sessao';
import { SIMULADOR } from '@/lib/config';
import { EntrarTeste } from '@/components/form-simples';

export const metadata: Metadata = { title: 'Entrar', robots: { index: false, follow: false } };

export default async function Entrar({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const destino = destinoSeguro((await searchParams).destino, '');
  const u = await usuarioAtual();
  if (u) redirect(destino || (u.tipo === 'contratante' ? '/painel' : '/candidato'));
  return (
    <>
      <Topo />
      <Acesso titulo="Que bom ter você" cinza="de volta." itens={['Suas candidaturas e conversas num lugar só', 'Vagas que combinam com o seu perfil', 'Para empresas: candidatos, artes e planos']}>
        <h1>Entrar</h1>
        <p className="leve">Vale para quem procura emprego e para quem contrata.</p>
        {SIMULADOR ? <EntrarTeste /> : null}
        <FormEntrar destino={destino} />
        <details className="caixa-dobra">
          <summary>Esqueci a senha ou nunca criei uma</summary>
          <p className="leve">Enviamos um link válido por 1 hora. Depois de entrar, crie ou troque a senha em Conta e senha.</p>
          <FormLink destino={destino} />
        </details>
        <p className="leve acesso-rodape">Ainda não tem conta? <Link href="/criar-conta">Criar conta</Link></p>
      </Acesso>
      <Rodape />
    </>
  );
}
