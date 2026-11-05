import { BASE } from '@/lib/base';
import { Selecao } from '@/components/selecao';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Hero, Perguntas } from '@/components/blocos';
import { Rodape, Topo } from '@/components/moldura';
import { PortaCandidato } from '@/components/portas';
import { CarrosselVagas, LetreiroEmpresas } from '@/components/vitrines';
import { CIDADE_PRINCIPAL, CIDADES, URL_SITE } from '@/lib/config';
import { banco } from '@/lib/db/client';
import { buscarVagas, empresasDoLetreiro, vagasAnunciadas } from '@/lib/vagas';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { alternates: { canonical: '/' } };

const FAQ = [
  { p: 'Preciso criar conta para me candidatar?', r: 'Sim, mas é rápido: solte o currículo, confira os dados e crie uma senha. A conta e a candidatura saem juntas.' },
  { p: 'Como a empresa fala comigo?', r: 'Pela conversa da candidatura, aqui no site. Você recebe um aviso no e-mail a cada resposta.' },
  { p: 'O candidato paga alguma coisa?', r: 'Pesquisar vagas, se candidatar e conversar com a empresa são sempre grátis. O plano Plus é opcional e traz extras. Desconfie de quem cobrar para você concorrer a uma vaga.' },
  { p: 'Atende quais cidades?', r: `${CIDADE_PRINCIPAL.nome} e região, incluindo ${CIDADES.slice(1, 4).map((c) => c.nome).join(', ')} e outras cidades próximas.` },
];

export default async function Inicio() {
  const db = await banco();
  // Vitrines da tela inicial: só anúncios pagos. A busca continua mostrando todas as vagas.
  const { total } = await buscarVagas(db, {});
  const itens = await vagasAnunciadas(db);
  const empresas = await empresasDoLetreiro(db);
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'WebSite', '@id': `${URL_SITE}/#site`, url: URL_SITE, name: 'GR Vagas', inLanguage: 'pt-BR', potentialAction: { '@type': 'SearchAction', target: `${URL_SITE}/vagas?q={q}`, 'query-input': 'required name=q' } },
      { '@type': 'FAQPage', '@id': `${URL_SITE}/#faq`, mainEntity: FAQ.map((f) => ({ '@type': 'Question', name: f.p, acceptedAnswer: { '@type': 'Answer', text: f.r } })) },
    ],
  };
  return (
    <>
      <Topo />
      <main>
        <Hero titulo="Emprego" cinza="sem enrolação." texto="Vagas em São José do Rio Preto e região. Busque, solte o currículo e converse direto com quem contrata." lado={<PortaCandidato />}>
          <form action={`${BASE}/vagas`} className="busca-grande" role="search">
            <label className="campo"><span>Qual vaga você procura?</span><input type="search" name="q" placeholder="Recepcionista, motorista, vendas" /></label>
            <label className="campo"><span>Cidade</span>
              <Selecao name="cidade" defaultValue="">
                <option value="">Todas</option>
                {CIDADES.map((c) => <option key={c.slug} value={c.slug}>{c.nome}</option>)}
              </Selecao>
            </label>
            <button className="btn">Buscar vagas</button>
          </form>
          <p className="heroi-empresa">Quer contratar? <Link href="/anunciantes">Anuncie sua vaga</Link></p>
        </Hero>

        {itens.length ? (
          <section className="vitrine" aria-labelledby="t-vagas">
            <div className="embrulho secao-cabeca">
              <div>
                <h2 id="t-vagas">Vagas em destaque</h2>
                <p className="secao-nota">Espaço de anúncio.</p>
              </div>
              <Link className="btn btn-claro" href={`/vagas`}>{total === 1 ? 'Ver a vaga aberta' : `Ver as ${total} vagas abertas`}</Link>
            </div>
            <CarrosselVagas vagas={itens} />
          </section>
        ) : null}

        {empresas.length ? (
          <section className="vitrine" aria-labelledby="t-empresas">
            <div className="embrulho secao-cabeca">
              <h2 id="t-empresas">Quem está contratando</h2>
              <p className="secao-nota">Empresas anunciantes. <Link href="/anunciantes">Quer a sua aqui?</Link></p>
            </div>
            <LetreiroEmpresas empresas={empresas} />
          </section>
        ) : null}

        <div className="folha">
          <section className="secao embrulho">
            <div className="secao-cabeca centro"><h2>Como funciona <em>para quem procura</em></h2></div>
            <ol className="grade-passos">
              <li><h3>Solte o currículo</h3><p>Seus dados se preenchem sozinhos. Sem PDF? Digite nome, WhatsApp e e-mail.</p></li>
              <li><h3>Veja o que combina</h3><p>As vagas mais parecidas com você aparecem primeiro.</p></li>
              <li><h3>Candidate-se com um toque</h3><p>Sua candidatura vai direto para a empresa.</p></li>
              <li><h3>Converse direto</h3><p>A resposta chega no site e no seu e-mail.</p></li>
            </ol>
          </section>

          <section className="secao embrulho" aria-labelledby="t-calc" style={{ paddingTop: 0 }}>
            <div className="secao-cabeca">
              <h2 id="t-calc">Contas do dia a dia <em>do trabalho</em></h2>
              <p className="secao-nota">Grátis e sem cadastro.</p>
            </div>
            <div className="grade-onde">
              <Link className="ferramenta tom-1" href="/calculos/volta-do-almoco"><h3>Volta do almoço</h3><p>Que horas você saiu e que horas precisa voltar.</p></Link>
              <Link className="ferramenta tom-0" href="/calculos/horas-extras"><h3>Horas extras</h3><p>Quanto vai receber a mais no mês.</p></Link>
            </div>
          </section>

          <section className="embrulho">
            <div className="chamada">
              <h2>Está contratando? <em>Sua vaga no ar em minutos.</em></h2>
              <div className="chamada-pe">
                <p>Publique grátis, poste uma arte bonita e receba os candidatos num lugar só.</p>
                <div className="linha-botoes">
                  <Link className="btn" href="/anunciantes">Ver como funciona</Link>
                  <Link className="btn btn-claro" href="/publicar">Publicar vaga</Link>
                </div>
              </div>
            </div>
          </section>

          <Perguntas itens={FAQ} />
        </div>
      </main>
      <Rodape />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
    </>
  );
}
