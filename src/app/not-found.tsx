import type { Metadata } from 'next';
import Link from 'next/link';
import { Hero } from '@/components/blocos';
import { Rodape, Topo } from '@/components/moldura';

export const metadata: Metadata = { title: 'Página não encontrada', robots: { index: false, follow: false } };

export default function NaoEncontrada() {
  return (
    <>
      <Topo />
      <main>
        <Hero titulo="Página não encontrada." cinza="Acontece." texto="O endereço pode estar errado ou esta página saiu do ar.">
          <div className="linha-botoes" style={{ marginTop: 24 }}><Link href="/vagas" className="btn">Ver vagas abertas</Link><Link href="/" className="btn btn-claro">Página inicial</Link></div>
        </Hero>
      </main>
      <Rodape />
    </>
  );
}
