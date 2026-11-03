import type { MetadataRoute } from 'next';
import { SITE_PUBLICO, URL_SITE } from '@/lib/config';

export default function robots(): MetadataRoute.Robots {
  if (!SITE_PUBLICO) return { rules: { userAgent: '*', disallow: '/' } };
  return { rules: { userAgent: '*', allow: '/', disallow: ['/painel', '/candidato', '/conversas', '/acesso', '/entrar', '/admin', '/api'] }, sitemap: `${URL_SITE}/sitemap.xml` };
}
