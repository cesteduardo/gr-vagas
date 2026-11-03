import type { Metadata } from 'next';
import Link from 'next/link';
import { Folha, Hero } from '@/components/blocos';
import { Rodape, Topo } from '@/components/moldura';
import { PLANOS_CANDIDATO, PLANOS_EMPRESA, precoEmReais } from '@/lib/config';

export const metadata: Metadata = { title: 'Planos para empresas e candidatos', description: 'Publique uma vaga grátis, com arte personalizada, e veja os planos para quem contrata todo mês. Para candidatos, pesquisar e se candidatar é sempre grátis.', alternates: { canonical: '/planos' } };

function Grade({ planos, destaque, acao }: { planos: readonly { id: string; nome: string; preco: number; resumo: string; itens: string[] }[]; destaque: string; acao: { href: string; rotulo: string } }) {
  return (
    <div className="grade-planos">
      {planos.map((p) => (
        <article key={p.id} className={`plano${p.id === destaque ? ' plano-forte' : ''}`}>
          <h3>{p.nome}</h3>
          <div className="plano-preco">{p.preco ? precoEmReais(p.preco) : 'R$ 0'}<small> por mês</small></div>
          <p className="leve">{p.resumo}</p>
          <ul>{p.itens.map((i) => <li key={i}>{i}</li>)}</ul>
          <Link className={`btn${p.id === destaque ? '' : ' btn-claro'}`} href={acao.href}>{acao.rotulo}</Link>
        </article>
      ))}
    </div>
  );
}

export default function Planos() {
  return (
    <>
      <Topo />
      <main>
        <Hero titulo="Comece grátis." cinza="Mude quando precisar." texto="Sem fidelidade: cancele quando quiser e use até o fim do período pago." />
        <Folha>
        <div className="secao embrulho">
        <section><h2 style={{ fontSize: 'clamp(26px, 3vw, 40px)' }}>Para quem contrata</h2><Grade planos={PLANOS_EMPRESA} destaque="essencial" acao={{ href: '/publicar', rotulo: 'Publicar vaga' }} /></section>
        <section style={{ marginTop: 56 }}>
          <h2 style={{ fontSize: 'clamp(26px, 3vw, 40px)' }}>Para quem procura emprego</h2>
          <p className="leve" style={{ marginTop: 10, maxWidth: '62ch' }}>Nunca cobramos para ver vagas, se candidatar ou conversar com a empresa. Desconfie de quem cobrar para você concorrer a uma vaga.</p>
          <Grade planos={PLANOS_CANDIDATO} destaque="" acao={{ href: '/vagas', rotulo: 'Ver vagas' }} />
        </section>
        </div>
        </Folha>
      </main>
      <Rodape />
    </>
  );
}
