import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { FormCriarConta } from '@/components/form-simples';
import { Acesso } from '@/components/acesso';
import { Rodape, Topo } from '@/components/moldura';
import { usuarioAtual } from '@/lib/auth/sessao';
import { destinoSeguro } from '@/lib/auth/contas';

export const metadata: Metadata = { title: 'Criar conta', description: 'Crie sua conta no GR Vagas para procurar emprego ou contratar em São José do Rio Preto e região.', alternates: { canonical: '/criar-conta' } };

export default async function CriarConta({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const u = await usuarioAtual();
  if (u) redirect(u.tipo === 'contratante' ? '/painel' : '/candidato');
  const s = await searchParams;
  const tipo = s.tipo === 'contratante' ? 'contratante' : 'candidato';
  const destino = destinoSeguro(s.destino, '');
  return (
    <>
      <Topo />
      <Acesso titulo="Comece em" cinza="um minuto." itens={['Sem formulário sem fim', 'Para se candidatar, nem precisa de conta: basta o currículo', 'Empresas publicam a primeira vaga grátis']}>
        <h1>Criar conta</h1>
        <p className="leve">Escolha o que você quer fazer e preencha o básico.</p>
        <FormCriarConta tipoInicial={tipo} destino={destino} />
        <p className="leve acesso-rodape">Já tem conta? <Link href={destino ? `/entrar?destino=${encodeURIComponent(destino)}` : '/entrar'}>Entrar</Link></p>
      </Acesso>
      <Rodape />
    </>
  );
}
