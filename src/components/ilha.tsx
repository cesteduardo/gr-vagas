'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { Palavra, Simbolo } from './marca';

export type ItemNav = { href: string; rotulo: string; contagem?: number };

function Contagem({ n }: { n?: number }) {
  return n ? <span className="selo-contagem">{n}<span className="so-leitor"> não lidas</span></span> : null;
}

// Mesmo comportamento da Zelo e da Automatize: barra solta no topo, pílula de vidro ao rolar.
export function Ilha({ itens, acao, extra }: { itens: ItemNav[]; acao: ItemNav; extra?: ReactNode }) {
  const [solida, setSolida] = useState(false);
  const [aberto, setAberto] = useState(false);
  const atual = usePathname();

  useEffect(() => {
    const aoRolar = () => setSolida(window.scrollY > 60);
    aoRolar();
    window.addEventListener('scroll', aoRolar, { passive: true });
    return () => window.removeEventListener('scroll', aoRolar);
  }, []);
  useEffect(() => {
    if (!aberto) return;
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setAberto(false);
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [aberto]);

  return (
    <div className={`${solida ? 'solida ' : ''}${aberto ? 'menu-aberto' : ''}`}>
      <header className="topbar">
        <div className="ilha">
          <Link href="/" className="marca" aria-label="GR Vagas, página inicial"><Simbolo /><Palavra /></Link>
          <nav className="nav-links" aria-label="Principal">
            {itens.map((i) => (
              <Link key={i.href} href={i.href} aria-current={atual === i.href ? 'page' : undefined}>{i.rotulo}<Contagem n={i.contagem} /></Link>
            ))}
          </nav>
          <div className="acoes-topo">
            {extra}
            <Link className="btn" href={acao.href}>{acao.rotulo}</Link>
          </div>
          <button type="button" className="menu-btn" aria-expanded={aberto} aria-label={aberto ? 'Fechar menu' : 'Abrir menu'} onClick={() => setAberto((a) => !a)}><span /></button>
        </div>
      </header>
      <div className="veu" aria-hidden="true" onClick={() => setAberto(false)} />
      <nav className="gaveta" aria-label="Menu" inert={!aberto}>
        {itens.map((i) => (
          <Link key={i.href} href={i.href} onClick={() => setAberto(false)}>{i.rotulo}<Contagem n={i.contagem} /></Link>
        ))}
        <Link className="btn" href={acao.href} onClick={() => setAberto(false)}>{acao.rotulo}</Link>
        {extra}
      </nav>
    </div>
  );
}
