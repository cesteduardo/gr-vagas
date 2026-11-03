import type { Metadata } from 'next';
import { Folha, Hero } from '@/components/blocos';
import { Rodape, Topo } from '@/components/moldura';
import { TextoPrivacidade } from '@/components/textos-legais';

export const metadata: Metadata = { title: 'Política de privacidade', description: 'Quais dados o GR Vagas trata, com quem compartilha e como exercer seus direitos pela LGPD.', alternates: { canonical: '/privacidade' } };

export default function Privacidade() {
  return (
    <>
      <Topo />
      <main>
        <Hero titulo="Política" cinza="de privacidade." />
        <Folha><div className="secao estreito"><TextoPrivacidade /></div></Folha>
      </main>
      <Rodape />
    </>
  );
}
