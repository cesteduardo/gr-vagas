'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { BotaoSeta } from './setas';

// Carrossel com setas no estilo da Apple: anda sozinho devagar, para quando a pessoa
// aponta ou toca, e as setas levam um cartão para frente ou para trás.
export function Carrossel({ children, rotulo, intervalo = 4500, classe = '' }: { children: ReactNode; rotulo: string; intervalo?: number; classe?: string }) {
  const trilho = useRef<HTMLDivElement>(null);
  const [parado, setParado] = useState(false);
  const [inicio, setInicio] = useState(true);
  const [fim, setFim] = useState(false);

  const passo = () => {
    const t = trilho.current;
    const item = t?.firstElementChild as HTMLElement | null;
    return item ? item.offsetWidth + 14 : 300;
  };
  const ir = (dir: 1 | -1) => {
    const t = trilho.current;
    if (!t) return;
    const noFim = t.scrollLeft + t.clientWidth >= t.scrollWidth - 4;
    if (dir === 1 && noFim) t.scrollTo({ left: 0, behavior: 'smooth' });
    else if (dir === -1 && t.scrollLeft <= 4) t.scrollTo({ left: t.scrollWidth, behavior: 'smooth' });
    else t.scrollBy({ left: dir * passo(), behavior: 'smooth' });
  };

  useEffect(() => {
    const t = trilho.current;
    if (!t) return;
    const ver = () => {
      setInicio(t.scrollLeft <= 4);
      setFim(t.scrollLeft + t.clientWidth >= t.scrollWidth - 4);
    };
    ver();
    t.addEventListener('scroll', ver, { passive: true });
    return () => t.removeEventListener('scroll', ver);
  }, []);

  useEffect(() => {
    if (parado || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') ir(1);
    }, intervalo);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parado, intervalo]);

  return (
    <div className={`carrossel-apple ${classe}`} aria-roledescription="carrossel" aria-label={rotulo} onPointerEnter={() => setParado(true)} onPointerLeave={() => setParado(false)} onFocus={() => setParado(true)} onBlur={() => setParado(false)} onTouchStart={() => setParado(true)}>
      <div ref={trilho} className="carrossel-trilho-apple">{children}</div>
      <div className="carrossel-setas">
        <BotaoSeta lado="esq" rotulo="Anterior" onClick={() => ir(-1)} disabled={false} />
        <BotaoSeta lado="dir" rotulo="Próximo" onClick={() => ir(1)} disabled={false} />
      </div>
      <span className="so-leitor">{inicio ? 'Início da lista' : fim ? 'Fim da lista' : ''}</span>
    </div>
  );
}
