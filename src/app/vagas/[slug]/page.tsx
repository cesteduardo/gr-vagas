import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { acaoCandidatarLogado, acaoSalvarVaga } from '@/app/acoes';
import { FormCandidatura } from '@/components/form-candidatura';
import { FormDenuncia } from '@/components/form-simples';
import { Folha } from '@/components/blocos';
import { ListaVagas } from '@/components/lista-vagas';
import { Rodape, Topo } from '@/components/moldura';
import { usuarioAtual } from '@/lib/auth/sessao';
import { URL_SITE } from '@/lib/config';
import { banco } from '@/lib/db/client';
import { compatibilidade, estaSalva, perfilDe } from '@/lib/perfis';
import { limites, planoDe } from '@/lib/planos';
import { formatarSalario } from '@/lib/texto';
import { vagaAceitaCandidatura, vagaPublica, vagasParecidas } from '@/lib/vagas';

type P = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const v = await vagaPublica(await banco(), (await params).slug);
  if (!v) return { title: 'Vaga não encontrada', robots: { index: false, follow: false } };
  const aberta = vagaAceitaCandidatura(v) && v.verificada;
  const description = `${v.titulo} na ${v.empresaNome}, em ${v.cidade}. ${v.contrato}, ${v.modalidade.toLowerCase()}. Salário: ${formatarSalario(v.salarioCentavos)}. Candidate-se em um minuto.`.slice(0, 160);
  return {
    title: `${v.titulo} em ${v.cidade}`,
    description,
    alternates: { canonical: `/vagas/${v.slug}` },
    ...(aberta ? {} : { robots: { index: false, follow: true } }),
    openGraph: { type: 'website', title: `${v.titulo} | ${v.empresaNome}`, description, url: `/vagas/${v.slug}` },
    twitter: { card: 'summary_large_image', title: `${v.titulo} | ${v.empresaNome}`, description },
  };
}

export default async function PaginaVaga({ params }: P) {
  const db = await banco();
  const v = await vagaPublica(db, (await params).slug);
  if (!v) notFound();
  const u = await usuarioAtual();
  const aceita = vagaAceitaCandidatura(v);
  const salva = u?.tipo === 'candidato' ? await estaSalva(db, u.id, v.id) : false;
  const plus = u?.tipo === 'candidato' ? limites(await planoDe(db, u.id)).plus : false;
  const combina = plus && u ? compatibilidade(await perfilDe(db, u.id), v) : null;
  const parecidas = aceita ? [] : await vagasParecidas(db, v);
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'JobPosting',
    title: v.titulo,
    description: `<p>${[v.descricao, v.requisitos, v.beneficios].map((t) => t.replace(/[<>&]/g, ' ')).join('</p><p>')}</p>`,
    datePosted: v.publicadaEm.toISOString(),
    validThrough: v.expiraEm.toISOString(),
    employmentType: { CLT: 'FULL_TIME', PJ: 'CONTRACTOR', 'Estágio': 'INTERN', 'Jovem aprendiz': 'INTERN', 'Temporário': 'TEMPORARY', Freelancer: 'CONTRACTOR' }[v.contrato],
    hiringOrganization: { '@type': 'Organization', name: v.empresaNome, sameAs: `${URL_SITE}/empresas/${v.empresaSlug}` },
    jobLocation: { '@type': 'Place', address: { '@type': 'PostalAddress', addressLocality: v.cidade, addressRegion: v.uf, addressCountry: v.pais } },
    ...(v.modalidade === 'Remoto' ? { jobLocationType: 'TELECOMMUTE', applicantLocationRequirements: { '@type': 'Country', name: v.pais } } : {}),
    ...(v.salarioCentavos ? { baseSalary: { '@type': 'MonetaryAmount', currency: v.moeda, value: { '@type': 'QuantitativeValue', value: v.salarioCentavos / 100, unitText: 'MONTH' } } } : {}),
    directApply: true,
  };
  return (
    <>
      <Topo />
      <main>
        <section className="heroi embrulho heroi-curto">
            <div className="vaga-empresa">
              {v.temLogo ? <img src={`/api/logo/${v.empresaId}`} alt={`Logo de ${v.empresaNome}`} width={56} height={56} /> : null}
              <div>
                <Link href={`/empresas/${v.empresaSlug}`} style={{ fontWeight: 700 }}>{v.empresaNome}</Link>
                {v.verificada ? null : <div className="nota">E-mail da empresa ainda não confirmado</div>}
              </div>
            </div>
            <h1>{v.titulo}</h1>
        </section>
        <Folha>
        <div className="secao embrulho">
        <div className="vaga-grade">
          <article>
            <dl className="vaga-fatos">
              <div><dt>Salário</dt><dd>{formatarSalario(v.salarioCentavos)}</dd></div>
              <div><dt>Contrato</dt><dd>{v.contrato}</dd></div>
              <div><dt>Modalidade</dt><dd>{v.modalidade}</dd></div>
              <div><dt>Cidade</dt><dd>{v.cidade} - {v.uf}</dd></div>
              <div><dt>Área</dt><dd>{v.area}</dd></div>
            </dl>
            {aceita ? <a className="btn btn-placa so-celular" href="#candidatar">Candidatar-me</a> : null}
            <section className="vaga-texto"><h2>O que você vai fazer</h2><p>{v.descricao}</p></section>
            <section className="vaga-texto"><h2>Requisitos</h2><p>{v.requisitos}</p></section>
            <section className="vaga-texto"><h2>Benefícios</h2><p>{v.beneficios}</p></section>
            <details className="denuncia">
              <summary>Denunciar esta vaga</summary>
              <p style={{ marginBottom: 12 }}>Nenhuma empresa deve cobrar para você concorrer a uma vaga. Se pediram dinheiro ou algo parece falso, conte aqui.</p>
              <FormDenuncia vagaId={v.id} />
            </details>
          </article>
          <aside className="vaga-lateral" id="candidatar">
            {!aceita ? (
              <div className="painel-caixa">
                <h2 style={{ fontSize: '26px', letterSpacing: '-.04em' }}>Esta vaga não recebe mais candidaturas</h2>
                <p className="leve" style={{ marginTop: 8 }}>A empresa encerrou ou o prazo terminou.</p>
                <div style={{ marginTop: 14 }}><Link className="btn" href={`/vagas/em/${v.cidadeSlug}`}>Ver vagas abertas em {v.cidade}</Link></div>
              </div>
            ) : u?.tipo === 'candidato' ? (
              <div className="painel-caixa pilha">
                <h2 style={{ fontSize: '26px', letterSpacing: '-.04em' }}>Candidate-se com um clique</h2>
                <p className="leve">A empresa vê o seu nome, contato e perfil.</p>
                {combina ? <p className="aviso aviso-ok"><strong>Combina {combina.porcentagem}% com o seu perfil.</strong>{combina.emComum.length ? ` Em comum: ${combina.emComum.join(', ')}.` : ''}</p> : plus ? <p className="nota">Preencha o <Link href="/candidato/perfil">perfil</Link> para ver quanto esta vaga combina com você.</p> : <p className="nota">Veja quanto esta vaga combina com você no <Link href="/candidato/plano">plano Plus</Link>.</p>}
                <form action={acaoCandidatarLogado}><input type="hidden" name="vagaId" value={v.id} /><button className="btn btn-placa" style={{ width: '100%' }}>Candidatar-me</button></form>
                <form action={acaoSalvarVaga}><input type="hidden" name="vagaId" value={v.id} /><input type="hidden" name="slug" value={v.slug} /><button className="btn btn-claro" style={{ width: '100%' }}>{salva ? 'Remover das salvas' : 'Salvar vaga'}</button></form>
              </div>
            ) : u ? (
              <div className="painel-caixa"><p className="leve">Você entrou com uma conta de empresa. Para se candidatar, use uma conta de candidato.</p></div>
            ) : (
              <div className="painel-caixa pilha">
                <h2 style={{ fontSize: '26px', letterSpacing: '-.04em' }}>Candidate-se</h2>
                <FormCandidatura vagaId={v.id} slug={v.slug} />
              </div>
            )}
          </aside>
        </div>
        </div>
        </Folha>
        {parecidas.length ? (
          <section style={{ marginTop: 56 }}>
            <h2>Vagas parecidas abertas</h2>
            <ListaVagas vagas={parecidas} />
          </section>
        ) : null}
      </main>
      <Rodape />
      {aceita && v.verificada ? <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} /> : null}
    </>
  );
}
