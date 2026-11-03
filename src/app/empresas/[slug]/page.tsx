import type { Metadata } from 'next';
import { eq, sql } from 'drizzle-orm';
import { cidadePorSlug } from '@/lib/config';
import { formatarCnpj, linkSite } from '@/lib/empresa';
import { formatarTelefone } from '@/lib/forms/validators';
import { notFound } from 'next/navigation';
import { Folha } from '@/components/blocos';
import { ListaVagas } from '@/components/lista-vagas';
import { Rodape, Topo } from '@/components/moldura';
import { banco } from '@/lib/db/client';
import { empresas } from '@/lib/db/schema';
import { buscarVagas } from '@/lib/vagas';

type P = { params: Promise<{ slug: string }> };

async function empresa(slug: string) {
  const [e] = await (await banco()).select({ id: empresas.id, nome: empresas.nome, descricao: empresas.descricao, slug: empresas.slug, perfil: empresas.perfil, temLogo: sql<boolean>`${empresas.logo} is not null` }).from(empresas).where(eq(empresas.slug, slug));
  return e ?? null;
}

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const e = await empresa((await params).slug);
  if (!e) return { title: 'Empresa não encontrada', robots: { index: false, follow: false } };
  return { title: `Vagas na ${e.nome}`, description: `Vagas de emprego abertas na ${e.nome}. Candidate-se em um minuto e converse direto com a empresa.`, alternates: { canonical: `/empresas/${e.slug}` } };
}

export default async function PaginaEmpresa({ params }: P) {
  const e = await empresa((await params).slug);
  if (!e) notFound();
  const { itens } = await buscarVagas(await banco(), { empresaId: e.id });
  const p = e.perfil ?? {};
  const cidade = cidadePorSlug(p.cidadeSlug ?? '');
  return (
    <>
      <Topo />
      <main>
        <section className="heroi embrulho">
        <header className="empresa-topo">
          {e.temLogo ? <img src={`/api/logo/${e.id}`} alt={`Logo de ${e.nome}`} width={88} height={88} /> : <span className="inicial grande">{e.nome.charAt(0).toUpperCase()}</span>}
          <div>
            <h1>{e.nome}</h1>
            <p className="leve">{[p.setor, cidade?.nome, p.tamanho, p.fundacao ? `desde ${p.fundacao}` : ''].filter(Boolean).join(', ')}</p>
          </div>
        </header>
        </section>
        <Folha>
        <div className="secao embrulho">
        <div className="empresa-grade">
          <div className="pilha">
            {e.descricao ? <section className="painel-caixa"><h2 className="subtitulo-painel" style={{ marginTop: 0 }}>Quem somos</h2><p style={{ whiteSpace: 'pre-line' }}>{e.descricao}</p></section> : null}
            {p.porQue ? <section className="painel-caixa"><h2 className="subtitulo-painel" style={{ marginTop: 0 }}>Por que trabalhar aqui</h2><p style={{ whiteSpace: 'pre-line' }}>{p.porQue}</p></section> : null}
          </div>
          <dl className="painel-caixa fatos-lado">
            {p.endereco || cidade ? <div><dt>Endereço</dt><dd>{[p.endereco, cidade ? `${cidade.nome} - ${cidade.uf}` : ''].filter(Boolean).join(', ')}</dd></div> : null}
            {p.site ? <div><dt>Site</dt><dd><a href={linkSite(p.site)} target="_blank" rel="noopener nofollow">{p.site}</a></dd></div> : null}
            {p.instagram ? <div><dt>Instagram</dt><dd><a href={`https://instagram.com/${p.instagram}`} target="_blank" rel="noopener nofollow">@{p.instagram}</a></dd></div> : null}
            {p.whatsapp ? <div><dt>WhatsApp</dt><dd>{formatarTelefone(p.whatsapp)}</dd></div> : null}
            {p.cnpj ? <div><dt>CNPJ</dt><dd>{formatarCnpj(p.cnpj)}{p.razaoSocial ? <><br />{p.razaoSocial}</> : null}</dd></div> : null}
          </dl>
        </div>
        <h2 className="subtitulo-painel">Vagas abertas</h2>
        {itens.length ? <ListaVagas vagas={itens} /> : <p className="vazio" style={{ marginTop: 16 }}>Esta empresa não tem vagas abertas agora.</p>}
        </div>
        </Folha>
      </main>
      <Rodape />
    </>
  );
}
