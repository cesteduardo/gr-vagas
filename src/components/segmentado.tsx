'use client';

import { useEffect, useLayoutEffect, useRef, type KeyboardEvent, type ReactNode, type RefObject } from 'react';

// Controle segmentado: uma pílula branca desliza até a opção escolhida.
// Quando as opções não cabem, a trilha rola por dentro e as bordas esmaecem só do lado que ainda tem mais.

const ATIVO = '[aria-pressed="true"], [aria-current="page"]';

/** Mede a opção ativa e põe a pílula em cima dela; também cuida das bordas e da rolagem. */
export function usePilula(trilha: RefObject<HTMLElement | null>, chave: unknown) {
  const primeira = useRef(true);

  useLayoutEffect(() => {
    const t = trilha.current;
    if (!t) return;
    const medir = () => {
      const a = t.querySelector<HTMLElement>(ATIVO);
      t.toggleAttribute('data-sem-pilula', !a);
      if (a) {
        t.style.setProperty('--px', `${a.offsetLeft}px`);
        t.style.setProperty('--py', `${a.offsetTop}px`);
        t.style.setProperty('--pw', `${a.offsetWidth}px`);
        t.style.setProperty('--ph', `${a.offsetHeight}px`);
      }
      const resto = t.scrollWidth - t.clientWidth - t.scrollLeft;
      t.toggleAttribute('data-esmaece-inicio', t.scrollLeft > 1);
      t.toggleAttribute('data-esmaece-fim', resto > 1);
    };
    medir();
    // Na primeira medida a pílula aparece já no lugar; depois disso ela desliza.
    if (primeira.current) requestAnimationFrame(() => t.setAttribute('data-pronta', ''));
    t.addEventListener('scroll', medir, { passive: true });
    const obs = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(medir);
    obs?.observe(t);
    t.querySelectorAll('button, a').forEach((b) => obs?.observe(b));
    document.fonts?.ready.then(medir).catch(() => {});
    return () => { t.removeEventListener('scroll', medir); obs?.disconnect(); };
  }, [trilha, chave]);

  // A opção escolhida fica sempre inteira à vista, com folga para sair do esmaecido.
  useEffect(() => {
    const t = trilha.current;
    const a = t?.querySelector<HTMLElement>(ATIVO);
    if (!t || !a || t.scrollWidth <= t.clientWidth) { primeira.current = false; return; }
    const folga = 24;
    const ini = a.offsetLeft - folga;
    const fim = a.offsetLeft + a.offsetWidth + folga - t.clientWidth;
    const alvo = t.scrollLeft > ini ? ini : t.scrollLeft < fim ? fim : t.scrollLeft;
    const calmo = primeira.current || matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (alvo !== t.scrollLeft) t.scrollTo({ left: Math.max(0, alvo), behavior: calmo ? 'auto' : 'smooth' });
    primeira.current = false;
  }, [trilha, chave]);
}

export type Opcao<T extends string | number> = { id: T; nome: ReactNode; extra?: ReactNode };

export function Segmentado<T extends string | number>({ rotulo, opcoes, valor, muda, aoMirar, className, cheio }: {
  rotulo: string;
  opcoes: readonly Opcao<T>[];
  valor: T;
  muda: (v: T) => void;
  /** Chamado quando o ponteiro ou o foco chega numa opção, antes da escolha. */
  aoMirar?: (v: T) => void;
  className?: string;
  /** Ocupa a largura toda, com as opções do mesmo tamanho. */
  cheio?: boolean;
}) {
  const trilha = useRef<HTMLDivElement>(null);
  usePilula(trilha, valor);
  const atual = Math.max(0, opcoes.findIndex((o) => o.id === valor));

  // Setas, Home e End mudam a escolha como numa lista de abas; só a opção escolhida recebe Tab.
  const tecla = (e: KeyboardEvent<HTMLButtonElement>) => {
    const ultimo = opcoes.length - 1;
    const k = e.key;
    const alvo = k === 'ArrowRight' || k === 'ArrowDown' ? (atual === ultimo ? 0 : atual + 1)
      : k === 'ArrowLeft' || k === 'ArrowUp' ? (atual === 0 ? ultimo : atual - 1)
      : k === 'Home' ? 0 : k === 'End' ? ultimo : -1;
    if (alvo < 0 || !opcoes[alvo]) return;
    e.preventDefault();
    muda(opcoes[alvo].id);
    trilha.current?.querySelectorAll<HTMLElement>('button')[alvo]?.focus({ preventScroll: true });
  };

  return (
    <div className={`segmentado${cheio ? ' segmentado-cheio' : ''}${className ? ` ${className}` : ''}`} role="group" aria-label={rotulo}>
      <div ref={trilha} className="segmentado-trilha">
        <span className="segmentado-pilula" aria-hidden="true" />
        {opcoes.map((o, i) => (
          <button
            key={String(o.id)}
            type="button"
            aria-pressed={o.id === valor}
            tabIndex={i === atual ? 0 : -1}
            onClick={() => muda(o.id)}
            onKeyDown={tecla}
            onPointerEnter={aoMirar ? () => aoMirar(o.id) : undefined}
            onFocus={aoMirar ? () => aoMirar(o.id) : undefined}
          >
            {o.nome}{o.extra}
          </button>
        ))}
      </div>
    </div>
  );
}
