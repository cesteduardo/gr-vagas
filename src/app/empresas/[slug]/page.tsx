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
import { linkWhatsapp } from '@/lib/texto';
import { buscarVagas } from '@/lib/vagas';

type P = { params: Promise<{ slug: string }> };

async function empresa(slug: string) {
  const [e] = await (await banco()).select({ id: empresas.id, nome: empresas.nome, descricao: empresas.descricao, slug: empresas.slug, perfil: empresas.perfil, criadoEm: empresas.criadoEm, temLogo: sql<boolean>`${empresas.logo} is not null`, temCapa: sql<boolean>`${empresas.capa} is not null` }).from(empresas).where(eq(empresas.slug, slug));
  return e ?? null;
}

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const e = await empresa((await params).slug);
  if (!e) return { title: 'Empresa não encontrada', robots: { index: false, follow: false } };
  return { title: `Vagas na ${e.nome}`, description: `Vagas de emprego abertas na ${e.nome}. Candidate-se em um minuto e converse direto com a empresa.`, alternates: { canonical: `/empresas/${e.slug}` } };
}

const Icone = ({ d }: { d: string }) => <svg className="icone-botao" viewBox="0 0 24 24" aria-hidden="true"><path d={d} /></svg>;
const ICONES = {
  whatsapp: 'M4.5 19.5l1.2-3.8A8 8 0 1 1 8.6 18.6zM9.2 8.6c.3 2.6 2.6 5 5.2 5.4l1.2-1.2 2 .9-.3 1.6c-4.4.3-8.6-3.9-8.4-8.3l1.6-.3.9 2z',
  site: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM3 12h18M12 3c2.5 2.6 3.5 5.6 3.5 9s-1 6.4-3.5 9c-2.5-2.6-3.5-5.6-3.5-9s1-6.4 3.5-9z',
  instagram: 'M7.5 3.5h9a4 4 0 0 1 4 4v9a4 4 0 0 1-4 4h-9a4 4 0 0 1-4-4v-9a4 4 0 0 1 4-4zM12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7zM17 6.8v.01',
};

export default async function PaginaEmpresa({ params }: P) {
  const e = await empresa((await params).slug);
  if (!e) notFound();
  const { itens } = await buscarVagas(await banco(), { empresaId: e.id });
  const p = e.perfil ?? {};
  const cidade = cidadePorSlug(p.cidadeSlug ?? '');
  const resumo = [p.setor, cidade?.nome, p.tamanho, p.fundacao ? `desde ${p.fundacao}` : ''].filter(Boolean).join(' · ');
  const endereco = [p.endereco, cidade ? `${cidade.nome} - ${cidade.uf}` : ''].filter(Boolean).join(', ');
  const desde = new Date(e.criadoEm).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric', timeZone: 'America/Sao_Paulo' });
  const temSobre = Boolean(e.descricao || p.porQue);
  const temFatos = Boolean(endereco || p.cnpj);
  return (
    <>
      <Topo />
      <main>
        <section className="heroi embrulho">
        <header className="empresa-topo">
          {/* Capa da empresa ou, sem ela, um degradê azul do site; o logo fica por cima, na emenda */}
          <div className="perfil-capa">{e.temCapa ? <img src={`/api/capa/${e.id}`} alt="" /> : null}</div>
          {e.temLogo ? <img className="perfil-avatar" src={`/api/logo/${e.id}`} alt={`Logo de ${e.nome}`} width={128} height={128} /> : <span className="perfil-avatar perfil-avatar-inicial" aria-hidden="true">{e.nome.charAt(0).toUpperCase()}</span>}
          <div>
            <h1>{e.nome}</h1>
            {resumo ? <p>{resumo}</p> : null}
          </div>
          <div className="linha-botoes empresa-acoes">
            {itens.length ? <a className="btn" href="#vagas">{itens.length === 1 ? 'Ver 1 vaga aberta' : `Ver ${itens.length} vagas abertas`}</a> : null}
            {p.whatsapp ? <a className="btn btn-claro" href={linkWhatsapp(p.whatsapp, `Olá! Vi a página da ${e.nome} no GR Vagas.`)} target="_blank" rel="noopener nofollow"><Icone d={ICONES.whatsapp} />WhatsApp</a> : null}
            {p.site ? <a className="btn btn-claro" href={linkSite(p.site)} target="_blank" rel="noopener nofollow"><Icone d={ICONES.site} />Site</a> : null}
            {p.instagram ? <a className="btn btn-claro" href={`https://instagram.com/${p.instagram}`} target="_blank" rel="noopener nofollow"><Icone d={ICONES.instagram} />Instagram</a> : null}
          </div>
        </header>
        </section>
        <Folha>
        <div className="secao embrulho">
        {temSobre || temFatos ? (
          <div className={temSobre && temFatos ? 'empresa-grade' : undefined}>
            {temSobre ? (
              <section className="painel-caixa empresa-sobre">
                {e.descricao ? <div><h2>Quem somos</h2><p>{e.descricao}</p></div> : null}
                {p.porQue ? <div><h2>Por que trabalhar aqui</h2><p>{p.porQue}</p></div> : null}
              </section>
            ) : null}
            {temFatos ? (
              <dl className="painel-caixa fatos-lado">
                {endereco ? <div><dt>Endereço</dt><dd>{endereco}</dd></div> : null}
                {p.whatsapp ? <div><dt>WhatsApp</dt><dd>{formatarTelefone(p.whatsapp)}</dd></div> : null}
                {p.cnpj ? <div><dt>CNPJ</dt><dd>{formatarCnpj(p.cnpj)}{p.razaoSocial ? <><br />{p.razaoSocial}</> : null}</dd></div> : null}
                <div><dt>No GR Vagas</dt><dd>Desde {desde}</dd></div>
              </dl>
            ) : null}
          </div>
        ) : null}
        <h2 className="subtitulo-painel" id="vagas">Vagas abertas</h2>
        {itens.length ? <ListaVagas vagas={itens} semEmpresa /> : <p className="vazio" style={{ marginTop: 16 }}>Esta empresa não tem vagas abertas agora.</p>}
        </div>
        </Folha>
      </main>
      <Rodape />
    </>
  );
}
