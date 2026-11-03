import type { Metadata } from 'next';
import { lerFiltros, PaginaBusca } from '@/components/pagina-busca';

export const metadata: Metadata = { title: 'Vagas de emprego em Rio Preto e região', description: 'Pesquise vagas de emprego em São José do Rio Preto e região por cargo, cidade, contrato e área. Candidate-se em um minuto, sem pagar nada.', alternates: { canonical: '/vagas' } };

export default async function Vagas({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <PaginaBusca titulo="Vagas abertas" cinza="em Rio Preto e região." descricao="Pesquise por cargo, cidade, contrato e área. Candidatar-se é sempre grátis." filtros={lerFiltros(await searchParams)} base="/vagas" />;
}
