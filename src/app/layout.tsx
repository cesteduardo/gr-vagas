import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import '@fontsource-variable/inter/wght.css';
import { NOME, SITE_PUBLICO, URL_SITE } from '@/lib/config';
import '@/styles/gr-vagas.css';

const DESCRICAO = 'Vagas de emprego em São José do Rio Preto e região, sem cadastro. Solte seu currículo e veja as vagas que combinam, ou publique sua vaga com arte pronta para postar.';

export const metadata: Metadata = {
  metadataBase: new URL(URL_SITE),
  title: { default: `Vagas em São José do Rio Preto sem cadastro | ${NOME}`, template: `%s | ${NOME}` },
  description: DESCRICAO,
  // Até o lançamento, nada é indexado.
  robots: SITE_PUBLICO ? { index: true, follow: true, 'max-image-preview': 'large' } : { index: false, follow: false },
  openGraph: { type: 'website', locale: 'pt_BR', siteName: NOME, description: DESCRICAO },
  twitter: { card: 'summary_large_image', description: DESCRICAO },
};

export const viewport: Viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover', themeColor: '#F6F6F7' };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
