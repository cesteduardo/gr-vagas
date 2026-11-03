import type { Metadata } from 'next';
import { Folha, Hero } from '@/components/blocos';
import { Rodape, Topo } from '@/components/moldura';
import { TextoTermos } from '@/components/textos-legais';

export const metadata: Metadata = { title: 'Termos de uso', description: 'Regras de uso do GR Vagas para quem publica vagas e para quem se candidata.', alternates: { canonical: '/termos' } };

export default function Termos() {
  return (
    <>
      <Topo />
      <main>
        <Hero titulo="Termos" cinza="de uso." />
        <Folha><div className="secao estreito"><TextoTermos /></div></Folha>
      </main>
      <Rodape />
    </>
  );
}
