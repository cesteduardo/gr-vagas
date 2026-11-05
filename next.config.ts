import type { NextConfig } from 'next';

const dev = process.env.NODE_ENV !== 'production';
const https = (process.env.NEXT_PUBLIC_SITE_URL ?? '').startsWith('https://');
// Morando num subcaminho de outro site (grbrands.com.br/vagas), o prefixo vem daqui.
const basePath = (process.env.NEXT_PUBLIC_CAMINHO_BASE ?? '').replace(/\/+$/, '');
// Atrás de um proxy (o Worker da GR Brands), os formulários chegam com a origem do domínio público.
const origens = (process.env.ORIGENS_PERMITIDAS ?? '').split(',').map((o) => o.trim()).filter(Boolean);

// Tudo vem do próprio site: fontes, imagens, scripts. O 'unsafe-inline' em script
// cobre os scripts que o Next põe na página e os do layout; 'unsafe-eval' e ws:
// só existem no desenvolvimento, para o recarregamento ao vivo.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  `connect-src 'self'${dev ? ' ws: wss:' : ''}`,
  "media-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(https ? ['upgrade-insecure-requests'] : []),
].join('; ');

const config: NextConfig = {
  serverExternalPackages: ['@electric-sql/pglite', 'pg', 'nodemailer', 'unpdf', '@anthropic-ai/sdk', 'pdfkit'],
  // O currículo em PDF (até 3 MB) segue junto com a candidatura.
  ...(basePath ? { basePath } : {}),
  experimental: { serverActions: { bodySizeLimit: '4mb', ...(origens.length ? { allowedOrigins: origens } : {}) } },
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: '/:caminho*',
        headers: [
          { key: 'Content-Security-Policy', value: csp },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()' },
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
          // Num subcaminho de outro site, o HSTS não pode valer para os subdomínios dele.
          ...(https ? [{ key: 'Strict-Transport-Security', value: basePath ? 'max-age=31536000' : 'max-age=31536000; includeSubDomains' }] : []),
        ],
      },
      {
        // O token do link de acesso está no endereço: não vai em Referer, não fica em cache, não é indexado.
        source: '/acesso/:token*',
        headers: [
          { key: 'Referrer-Policy', value: 'no-referrer' },
          { key: 'Cache-Control', value: 'no-store, max-age=0' },
          { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
        ],
      },
    ];
  },
};

export default config;
