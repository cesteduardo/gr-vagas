'use client';

import { Children, isValidElement, useEffect, useId, useRef, useState, type ChangeEvent, type KeyboardEvent, type ReactElement, type ReactNode } from 'react';

type PropsOpcao = { value?: string | number; children?: ReactNode };
type Props = { name?: string; id?: string; value?: string | number; defaultValue?: string | number; onChange?: (e: ChangeEvent<HTMLSelectElement>) => void; children: ReactNode; 'aria-invalid'?: true; 'aria-describedby'?: string; 'aria-label'?: string };

// Menu de seleção no estilo do site. O <select> de verdade continua ali, escondido:
// é ele que vai no formulário, e por isso tudo funciona como um campo comum.
export function Selecao({ name, id, value, defaultValue, onChange, children, 'aria-invalid': invalido, 'aria-describedby': descrito, 'aria-label': rotulo }: Props) {
  const opcoes = Children.toArray(children)
    .filter((c): c is ReactElement<PropsOpcao> => isValidElement(c))
    .map((c) => ({ valor: String(c.props.value ?? c.props.children ?? ''), rotulo: String(c.props.children ?? '') }));
  const [interno, setInterno] = useState(String(defaultValue ?? opcoes[0]?.valor ?? ''));
  const atual = value !== undefined ? String(value) : interno;
  const [aberto, setAberto] = useState(false);
  const [ativo, setAtivo] = useState(0);
  const caixa = useRef<HTMLSpanElement>(null);
  const nativo = useRef<HTMLSelectElement>(null);
  const baseId = useId();
  const indice = Math.max(0, opcoes.findIndex((o) => o.valor === atual));

  useEffect(() => {
    if (!aberto) return;
    const fora = (e: PointerEvent) => {
      if (!caixa.current?.contains(e.target as Node)) setAberto(false);
    };
    document.addEventListener('pointerdown', fora);
    return () => document.removeEventListener('pointerdown', fora);
  }, [aberto]);

  useEffect(() => {
    if (aberto) caixa.current?.querySelector(`[data-i="${ativo}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [aberto, ativo]);

  const escolher = (valor: string) => {
    setAberto(false);
    const s = nativo.current;
    if (!s || s.value === valor) return;
    // Passa pelo campo de verdade, para o formulário e quem escuta verem a mudança.
    const definir = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')?.set;
    definir?.call(s, valor);
    s.dispatchEvent(new Event('change', { bubbles: true }));
  };

  const tecla = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      if (aberto) e.preventDefault();
      setAberto(false);
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const passo = e.key === 'ArrowDown' ? 1 : -1;
      if (!aberto) {
        setAtivo(indice);
        setAberto(true);
      } else setAtivo((a) => Math.min(opcoes.length - 1, Math.max(0, a + passo)));
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (aberto) escolher(opcoes[ativo]?.valor ?? atual);
      else {
        setAtivo(indice);
        setAberto(true);
      }
    } else if (aberto && e.key === 'Home') {
      e.preventDefault();
      setAtivo(0);
    } else if (aberto && e.key === 'End') {
      e.preventDefault();
      setAtivo(opcoes.length - 1);
    } else if (e.key === 'Tab') setAberto(false);
    else if (e.key.length === 1 && /\S/.test(e.key)) {
      // Digitar uma letra pula para a primeira opção que começa com ela.
      const alvo = opcoes.findIndex((o, i) => i > (aberto ? ativo : indice) && o.rotulo.toLowerCase().startsWith(e.key.toLowerCase()));
      const i = alvo >= 0 ? alvo : opcoes.findIndex((o) => o.rotulo.toLowerCase().startsWith(e.key.toLowerCase()));
      if (i >= 0) {
        if (aberto) setAtivo(i);
        else escolher(opcoes[i]!.valor);
      }
    }
  };

  return (
    <span className={`selecao${aberto ? ' aberta' : ''}`} ref={caixa}>
      <button type="button" id={id} className="selecao-botao" role="combobox" aria-haspopup="listbox" aria-expanded={aberto} aria-controls={`${baseId}-l`} aria-activedescendant={aberto ? `${baseId}-${ativo}` : undefined} aria-invalid={invalido} aria-describedby={descrito} aria-label={rotulo} onClick={(e) => { e.preventDefault(); setAtivo(indice); setAberto((a) => !a); }} onKeyDown={tecla}>
        <span>{opcoes[indice]?.rotulo}</span>
      </button>
      <select ref={nativo} className="so-leitor" name={name} tabIndex={-1} aria-hidden="true" value={atual} onChange={(e) => { setInterno(e.target.value); onChange?.(e); }}>
        {children}
      </select>
      {aberto ? (
        <ul className="selecao-lista" id={`${baseId}-l`} role="listbox" onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
          {opcoes.map((o, i) => (
            <li key={o.valor} id={`${baseId}-${i}`} data-i={i} role="option" aria-selected={o.valor === atual} className={i === ativo ? 'ativa' : undefined} onPointerEnter={() => setAtivo(i)} onClick={() => escolher(o.valor)}>
              <span>{o.rotulo}</span>
              {o.valor === atual ? <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg> : null}
            </li>
          ))}
        </ul>
      ) : null}
    </span>
  );
}
