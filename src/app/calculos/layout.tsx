import type { ReactNode } from 'react';
import { CabecaCalculos } from '@/components/cabeca-calculos';
import { Rodape, Topo } from '@/components/moldura';

export default function LayoutCalculos({ children }: { children: ReactNode }) {
  return (
    <>
      <Topo />
      <main>
        <CabecaCalculos />
        {children}
      </main>
      <Rodape />
    </>
  );
}
