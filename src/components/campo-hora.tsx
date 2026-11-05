'use client';

import { useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react';
import { paraMinutos } from '@/lib/calculos';

// Hora escolhida em roleta, como no relógio do celular: nada de digitar "12:00", basta girar.

/** Mantido para quem ainda recebe hora digitada: só números e os dois pontos entram sozinhos. */
export function mascararHora(bruto: string): string {
  const d = bruto.replace(/\D/g, '').slice(0, 4);
  if (d.length <= 2) return d;
  return `${d.slice(0, 2)}:${d.slice(2)}`;
}

const ALTURA = 44;
const HORAS = Array.from({ length: 24 }, (_, i) => i);
const MINUTOS = Array.from({ length: 60 }, (_, i) => i);
const dois = (n: number) => String(n).padStart(2, '0');

function Roleta({ itens, valor, muda, rotulo }: { itens: number[]; valor: number; muda: (n: number) => void; rotulo: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const id = useId();
  const mexendo = useRef(false); // a pessoa está girando
  const levando = useRef(false); // o código está rolando até um valor
  const pausa = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const indice = Math.max(0, itens.indexOf(valor));

  // Abre já no valor certo, sem animação.
  useLayoutEffect(() => {
    if (ref.current) ref.current.scrollTop = indice * ALTURA;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Mudou por clique ou teclado: a roleta gira até lá.
  useEffect(() => {
    const el = ref.current;
    if (!el || mexendo.current) return;
    const alvo = indice * ALTURA;
    if (Math.abs(el.scrollTop - alvo) < 2) return;
    levando.current = true;
    el.scrollTo({ top: alvo, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }, [indice]);

  const rolou = () => {
    const el = ref.current;
    if (!el) return;
    clearTimeout(pausa.current);
    pausa.current = setTimeout(() => { mexendo.current = false; levando.current = false; }, 140);
    if (levando.current) return;
    mexendo.current = true;
    const i = Math.min(itens.length - 1, Math.max(0, Math.round(el.scrollTop / ALTURA)));
    const n = itens[i];
    if (n !== undefined && n !== valor) muda(n);
  };

  // Clique trava a roleta no item escolhido antes de qualquer outro evento de
  // rolagem (o encaixe do scroll-snap, por exemplo) conseguir trocar o valor.
  const escolher = (n: number) => {
    const el = ref.current;
    mexendo.current = false;
    if (el) {
      levando.current = true;
      clearTimeout(pausa.current);
      pausa.current = setTimeout(() => { levando.current = false; }, 400);
      el.scrollTo({ top: itens.indexOf(n) * ALTURA, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    }
    muda(n);
  };

  const tecla = (e: KeyboardEvent<HTMLDivElement>) => {
    const passo = { ArrowDown: 1, ArrowUp: -1, PageDown: 5, PageUp: -5 }[e.key];
    let i = indice;
    if (passo) i = (indice + passo + itens.length) % itens.length;
    else if (e.key === 'Home') i = 0;
    else if (e.key === 'End') i = itens.length - 1;
    else return;
    e.preventDefault();
    mexendo.current = false;
    const n = itens[i];
    if (n !== undefined) muda(n);
  };

  return (
    <div
      ref={ref}
      className="roleta"
      role="listbox"
      tabIndex={0}
      aria-label={rotulo}
      aria-activedescendant={`${id}-${valor}`}
      onScroll={rolou}
      onKeyDown={tecla}
    >
      {itens.map((n) => (
        <div
          key={n}
          id={`${id}-${n}`}
          role="option"
          aria-selected={n === valor}
          className="roleta-item"
          onClick={() => escolher(n)}
        >
          {dois(n)}
        </div>
      ))}
    </div>
  );
}

const agora = () => {
  const d = new Date();
  return `${dois(d.getHours())}:${dois(d.getMinutes())}`;
};

export function SeletorHora({ valor, muda, rotulo, inicial }: { valor: string; muda: (v: string) => void; rotulo: string; inicial?: string }) {
  const [aberto, setAberto] = useState(false);
  const [direita, setDireita] = useState(false);
  const caixa = useRef<HTMLDivElement>(null);
  const botao = useRef<HTMLButtonElement>(null);
  const valida = paraMinutos(valor) !== null;
  const [h = 0, m = 0] = valida ? valor.split(':').map(Number) : [];

  const abrir = () => {
    if (!valida) muda(inicial && paraMinutos(inicial) !== null ? inicial : agora());
    setAberto(true);
  };
  const fechar = (devolverFoco = true) => {
    setAberto(false);
    if (devolverFoco) botao.current?.focus();
  };

  // Abre para baixo; perto da borda direita da tela, alinha pela direita.
  useLayoutEffect(() => {
    if (!aberto || !caixa.current) return;
    const r = caixa.current.getBoundingClientRect();
    setDireita(r.left + 264 > window.innerWidth - 12);
    caixa.current.querySelector<HTMLElement>('.roleta')?.focus({ preventScroll: true });
  }, [aberto]);

  useEffect(() => {
    if (!aberto) return;
    const fora = (e: PointerEvent) => { if (!caixa.current?.contains(e.target as Node)) fechar(false); };
    document.addEventListener('pointerdown', fora);
    return () => document.removeEventListener('pointerdown', fora);
  }, [aberto]);

  return (
    <div
      ref={caixa}
      className="seletor-hora"
      onKeyDown={(e) => { if (e.key === 'Escape' && aberto) { e.stopPropagation(); fechar(); } }}
    >
      <button
        ref={botao}
        type="button"
        className="hora-botao"
        data-hora={valida ? valor : ''}
        aria-haspopup="dialog"
        aria-expanded={aberto}
        aria-label={`${rotulo}: ${valida ? valor : 'escolher'}`}
        onClick={() => (aberto ? fechar() : abrir())}
      >
        <span className={valida ? '' : 'hora-vazia'}>{valida ? valor : '--:--'}</span>
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></svg>
      </button>
      {aberto ? (
        <div className={`hora-pop${direita ? ' a-direita' : ''}`} role="dialog" aria-label={rotulo}>
          <div className="hora-rodas">
            <span className="hora-faixa" aria-hidden="true" />
            <Roleta itens={HORAS} valor={h} muda={(n) => muda(`${dois(n)}:${dois(m)}`)} rotulo="Horas" />
            <span className="hora-dois-pontos" aria-hidden="true">:</span>
            <Roleta itens={MINUTOS} valor={m} muda={(n) => muda(`${dois(h)}:${dois(n)}`)} rotulo="Minutos" />
          </div>
          <div className="hora-acoes">
            <button type="button" className="btn btn-claro btn-peq" onClick={() => muda(agora())}>Agora</button>
            <button type="button" className="btn btn-peq" onClick={() => fechar()}>Pronto</button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
