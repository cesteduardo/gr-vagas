import { Selecao } from '@/components/selecao';
import Link from 'next/link';
import { AREAS, CIDADES, CONTRATOS, MODALIDADES } from '@/lib/config';
import { banco } from '@/lib/db/client';
import { buscarVagas, POR_PAGINA, type Filtros } from '@/lib/vagas';
import { Folha, Hero } from './blocos';
import { ListaVagas } from './lista-vagas';
import { Rodape, Topo } from './moldura';

const urlPagina = (base: string, f: Filtros, p: number) => {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries({ q: f.q, cidade: base === '/vagas' ? f.cidade : undefined, contrato: f.contrato, modalidade: f.modalidade, area: f.area })) if (v) q.set(k, v);
  if (p > 1) q.set('pagina', String(p));
  const s = q.toString();
  return s ? `${base}?${s}` : base;
};

export async function PaginaBusca({ titulo, cinza, descricao, filtros, base, cidadeFixa }: { titulo: string; cinza?: string; descricao: string; filtros: Filtros; base: string; cidadeFixa?: boolean }) {
  const { itens, total, pagina } = await buscarVagas(await banco(), filtros);
  const temFiltro = Boolean(filtros.q || filtros.contrato || filtros.modalidade || filtros.area || (!cidadeFixa && filtros.cidade));
  return (
    <>
      <Topo />
      <main>
        <Hero titulo={titulo} cinza={cinza} texto={descricao} />
        <Folha>
        <div className="secao embrulho">
        <form action={base} className="painel-caixa">
          <div className="busca">
            <label className="campo"><span>Cargo ou palavra-chave</span><input type="search" name="q" defaultValue={filtros.q} placeholder="Recepcionista, motorista, vendas" /></label>
            {cidadeFixa ? null : (
              <label className="campo"><span>Cidade</span>
                <Selecao name="cidade" defaultValue={filtros.cidade ?? ''}>
                  <option value="">Todas</option>
                  {CIDADES.map((c) => <option key={c.slug} value={c.slug}>{c.nome}</option>)}
                </Selecao>
              </label>
            )}
            <button className="btn">Buscar vagas</button>
          </div>
          <div className="busca-filtros">
            <label className="campo"><span>Contrato</span><Selecao name="contrato" defaultValue={filtros.contrato ?? ''}><option value="">Todos</option>{CONTRATOS.map((c) => <option key={c}>{c}</option>)}</Selecao></label>
            <label className="campo"><span>Modalidade</span><Selecao name="modalidade" defaultValue={filtros.modalidade ?? ''}><option value="">Todas</option>{MODALIDADES.map((c) => <option key={c}>{c}</option>)}</Selecao></label>
            <label className="campo"><span>Área</span><Selecao name="area" defaultValue={filtros.area ?? ''}><option value="">Todas</option>{AREAS.map((c) => <option key={c}>{c}</option>)}</Selecao></label>
          </div>
        </form>
        <p className="nota" style={{ marginTop: 20, paddingLeft: 6 }} role="status">{total === 1 ? '1 vaga encontrada' : `${total} vagas encontradas`}</p>
        {itens.length ? (
          <>
            <h2 className="so-leitor">Resultados</h2>
            <ListaVagas vagas={itens} />
          </>
        ) : (
          <div className="vazio" style={{ marginTop: 16 }}>
            <h2 style={{ fontSize: '1.6rem' }}>{temFiltro ? 'Nenhuma vaga com esses filtros' : 'Ainda não há vagas aqui'}</h2>
            <p className="leve">{temFiltro ? 'Tente menos filtros ou outra palavra. Você também pode receber um alerta quando surgir uma vaga.' : 'Crie um alerta e avisamos por e-mail quando surgir uma vaga.'}</p>
            <div className="linha-botoes" style={{ justifyContent: 'center', marginTop: 12 }}>
              {temFiltro ? <Link className="btn btn-claro" href={base}>Limpar filtros</Link> : null}
              <Link className="btn" href="/candidato/alertas">Criar alerta</Link>
            </div>
          </div>
        )}
        {total > POR_PAGINA ? (
          <nav className="paginacao" aria-label="Páginas">
            {pagina > 1 ? <Link className="btn btn-claro" href={urlPagina(base, filtros, pagina - 1)}>Página anterior</Link> : <span />}
            {pagina * POR_PAGINA < total ? <Link className="btn btn-claro" href={urlPagina(base, filtros, pagina + 1)}>Próxima página</Link> : null}
          </nav>
        ) : null}
        <h2 style={{ fontSize: 'clamp(24px, 2.4vw, 32px)', marginTop: 56 }}>Vagas por cidade</h2>
        <nav className="links-cidades" aria-label="Vagas por cidade" style={{ marginTop: 12 }}>
          {CIDADES.map((c) => <Link key={c.slug} href={`/vagas/em/${c.slug}`}>{c.nome}</Link>)}
        </nav>
        </div>
        </Folha>
      </main>
      <Rodape />
    </>
  );
}

export const lerFiltros = (s: Record<string, string | string[] | undefined>): Filtros => {
  const um = (k: string) => (typeof s[k] === 'string' && s[k] ? (s[k] as string).slice(0, 80) : undefined);
  return { q: um('q'), cidade: um('cidade'), contrato: um('contrato'), modalidade: um('modalidade'), area: um('area'), pagina: Number(um('pagina')) || 1 };
};
