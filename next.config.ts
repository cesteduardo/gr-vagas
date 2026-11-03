import type { NextConfig } from 'next';

const config: NextConfig = {
  serverExternalPackages: ['@electric-sql/pglite', 'pg', 'nodemailer', 'unpdf', '@anthropic-ai/sdk'],
  // O currículo em PDF (até 3 MB) segue junto com a candidatura.
  experimental: { serverActions: { bodySizeLimit: '4mb' } },
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: '/:caminho*',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ];
  },
};

export default config;
