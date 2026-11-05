'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useRef } from 'react';
import { usePilula } from './segmentado';

export function Abas({ rotulo, itens }: { rotulo: string; itens: { href: string; nome: string; raiz?: boolean }[] }) {
  const atual = usePathname();
  const trilha = useRef<HTMLDivElement>(null);
  usePilula(trilha, atual);
  return (
    <nav className="segmentado abas" aria-label={rotulo}>
      <div ref={trilha} className="segmentado-trilha">
        <span className="segmentado-pilula" aria-hidden="true" />
        {itens.map((i) => {
          const ativo = i.raiz ? atual === i.href || atual.startsWith(`${i.href}/vagas`) : atual.startsWith(i.href);
          return <Link key={i.href} href={i.href} aria-current={ativo ? 'page' : undefined}>{i.nome}</Link>;
        })}
      </div>
    </nav>
  );
}

// Abas que mudam pela query (?aba=), não pelo caminho: quem chama diz qual está ativa.
export function AbasLinks({ rotulo, itens }: { rotulo: string; itens: { href: string; nome: string; ativo: boolean }[] }) {
  const trilha = useRef<HTMLDivElement>(null);
  usePilula(trilha, itens.findIndex((i) => i.ativo));
  return (
    <nav className="segmentado abas-secao" aria-label={rotulo}>
      <div ref={trilha} className="segmentado-trilha">
        <span className="segmentado-pilula" aria-hidden="true" />
        {itens.map((i) => <Link key={i.href} href={i.href} aria-current={i.ativo ? 'page' : undefined}>{i.nome}</Link>)}
      </div>
    </nav>
  );
}
