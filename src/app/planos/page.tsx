import type { Metadata } from 'next';
import Link from 'next/link';
import { Folha, Hero } from '@/components/blocos';
import { Rodape, Topo } from '@/components/moldura';
import { AlternarPlanos } from '@/components/alternar-planos';
import { CartaoPlano } from '@/components/cartao-plano';
import { PLANOS_CANDIDATO, PLANOS_EMPRESA } from '@/lib/config';

export const metadata: Metadata = { title: 'Planos para empresas e candidatos', description: 'Publique uma vaga grátis, com arte personalizada, e veja os planos para quem contrata todo mês. Para candidatos, pesquisar e se candidatar é sempre grátis.', alternates: { canonical: '/planos' } };

export default async function Planos({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const inicial = (await searchParams).para === 'candidato' ? 'candidato' : 'empresa';
  return (
    <>
      <Topo />
      <main>
        <Hero titulo="Comece grátis." cinza="Mude quando precisar." texto="Sem fidelidade: cancele quando quiser e use até o fim do período pago." />
        <Folha>
        <div className="secao embrulho">
          <AlternarPlanos
            inicial={inicial}
            empresa={
              <>
                <div className="grade-planos planos-3">
                  {PLANOS_EMPRESA.map((p) => (
                    <CartaoPlano key={p.id} plano={p} forte={p.id === 'essencial'} etiqueta={p.id === 'essencial' ? 'Mais escolhido' : undefined} acao={p.preco ? <Link className={`btn${p.id === 'essencial' ? '' : ' btn-claro'}`} href="/painel/plano">Assinar {p.nome}</Link> : <Link className="btn btn-claro" href="/publicar">Publicar grátis</Link>} />
                  ))}
                </div>
                <aside className="planos-extra">
                  <div>
                    <h3>Impulsione uma vaga</h3>
                    <p>Ela aparece na tela inicial do GR Vagas, para quem chega procurando emprego. Peça pela própria vaga, no painel; vale para qualquer plano.</p>
                  </div>
                  <Link className="btn btn-claro btn-peq" href="/anunciantes">Saber mais</Link>
                </aside>
              </>
            }
            candidato={
              <>
                <p className="planos-aviso">Nunca cobramos para ver vagas, se candidatar ou conversar com a empresa. Desconfie de quem cobrar para você concorrer a uma vaga.</p>
                <div className="grade-planos planos-2">
                  {PLANOS_CANDIDATO.map((p) => (
                    <CartaoPlano key={p.id} plano={p} forte={p.id === 'plus'} acao={p.preco ? <Link className="btn" href="/candidato/plano">Assinar {p.nome}</Link> : <Link className="btn btn-claro" href="/vagas">Ver vagas</Link>} />
                  ))}
                </div>
              </>
            }
          />
          <p className="planos-pagamento">Pague por Pix, boleto ou cartão.</p>
        </div>
        </Folha>
      </main>
      <Rodape />
    </>
  );
}
