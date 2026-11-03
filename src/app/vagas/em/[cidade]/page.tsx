import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { lerFiltros, PaginaBusca } from '@/components/pagina-busca';
import { cidadePorSlug } from '@/lib/config';

type P = { params: Promise<{ cidade: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const c = cidadePorSlug((await params).cidade);
  if (!c) return {};
  return { title: `Vagas de emprego em ${c.nome} - ${c.uf}`, description: `Vagas de emprego abertas em ${c.nome}, ${c.uf}. Pesquise por cargo, contrato e área e candidate-se em um minuto, sem pagar nada.`, alternates: { canonical: `/vagas/em/${c.slug}` } };
}

export default async function VagasCidade({ params, searchParams }: P) {
  const c = cidadePorSlug((await params).cidade);
  if (!c) notFound();
  return <PaginaBusca titulo="Vagas em" cinza={`${c.nome}.`} descricao="Pesquise por cargo, contrato e área. Candidatar-se é sempre grátis." filtros={{ ...lerFiltros(await searchParams), cidade: c.slug }} base={`/vagas/em/${c.slug}`} cidadeFixa />;
}
