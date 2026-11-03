import type { ReactNode } from 'react';
import { Rodape, Topo } from '@/components/moldura';

export default function LayoutCalculos({ children }: { children: ReactNode }) {
  return (
    <>
      <Topo />
      <main>{children}</main>
      <Rodape />
    </>
  );
}
