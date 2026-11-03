import type { MetadataRoute } from 'next';
import { CIDADES, SITE_PUBLICO, URL_SITE } from '@/lib/config';
import { banco } from '@/lib/db/client';
import { buscarVagas } from '@/lib/vagas';

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (!SITE_PUBLICO) return [];
  const fixos = ['', '/vagas', '/anunciantes', '/calculos/volta-do-almoco', '/calculos/horas-extras', '/publicar', '/planos', '/termos', '/privacidade', ...CIDADES.map((c) => `/vagas/em/${c.slug}`)];
  const db = await banco();
  const vagas = [];
  for (let pagina = 1; pagina <= 50; pagina += 1) {
    const { itens } = await buscarVagas(db, { pagina });
    vagas.push(...itens);
    if (itens.length < 20) break;
  }
  return [...fixos.map((c) => ({ url: `${URL_SITE}${c}` })), ...vagas.map((v) => ({ url: `${URL_SITE}/vagas/${v.slug}`, lastModified: v.publicadaEm }))];
}
