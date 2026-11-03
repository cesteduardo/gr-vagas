'use client';

import { useEffect, useRef, useState, type PointerEvent } from 'react';

const hexParaHsv = (hex: string): [number, number, number] => {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => v / 255) as [number, number, number];
  const mx = Math.max(r, g, b);
  const d = mx - Math.min(r, g, b);
  let h = 0;
  if (d) h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [(h * 60 + 360) % 360, mx ? d / mx : 0, mx];
};

const hsvParaHex = (h: number, s: number, v: number) => {
  const f = (k: number) => {
    const x = (k + h / 60) % 6;
    return v - v * s * Math.max(0, Math.min(x, 4 - x, 1));
  };
  return `#${[f(5), f(3), f(1)].map((c) => Math.round(c * 255).toString(16).padStart(2, '0')).join('')}`.toUpperCase();
};

// Seletor de cor do próprio site: área de tom e brilho, faixa de matiz e código.
export function SeletorCor({ rotulo, valor, muda }: { rotulo: string; valor: string; muda: (hex: string) => void }) {
  const [aberto, setAberto] = useState(false);
  const [hsv, setHsv] = useState(() => hexParaHsv(valor));
  const [texto, setTexto] = useState(valor);
  const caixa = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    setTexto(valor);
    setHsv((a) => (hsvParaHex(...a) === valor ? a : hexParaHsv(valor)));
  }, [valor]);

  useEffect(() => {
    if (!aberto) return;
    const fora = (e: globalThis.PointerEvent) => {
      if (!caixa.current?.contains(e.target as Node)) setAberto(false);
    };
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setAberto(false);
    document.addEventListener('pointerdown', fora);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('pointerdown', fora);
      document.removeEventListener('keydown', esc);
    };
  }, [aberto]);

  const aplicar = (h: number, s: number, v: number) => {
    setHsv([h, s, v]);
    muda(hsvParaHex(h, s, v));
  };

  const arrastar = (alvo: 'area' | 'matiz') => (e: PointerEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    el.setPointerCapture(e.pointerId);
    const mover = (x: number, y: number) => {
      const r = el.getBoundingClientRect();
      const px = Math.min(1, Math.max(0, (x - r.left) / r.width));
      const py = Math.min(1, Math.max(0, (y - r.top) / r.height));
      if (alvo === 'area') aplicar(hsv[0], px, 1 - py);
      else aplicar(px * 360, hsv[1], hsv[2]);
    };
    mover(e.clientX, e.clientY);
    el.onpointermove = (ev) => mover(ev.clientX, ev.clientY);
    el.onpointerup = () => {
      el.onpointermove = null;
    };
  };

  const [h, s, v] = hsv;
  return (
    <span className="seletor-cor" ref={caixa}>
      <button type="button" className="seletor-cor-botao" aria-expanded={aberto} aria-label={`${rotulo}: ${valor}`} onClick={() => setAberto((a) => !a)}>
        {rotulo}
        <i style={{ background: valor }} aria-hidden="true" />
      </button>
      {aberto ? (
        <span className="seletor-cor-painel" role="dialog" aria-label={`Escolher ${rotulo.toLowerCase()}`}>
          <div className="seletor-area" style={{ backgroundColor: `hsl(${h} 100% 50%)`, backgroundImage: 'linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, transparent)' }} onPointerDown={arrastar('area')} role="slider" aria-label="Tom e brilho" aria-valuenow={Math.round(s * 100)} tabIndex={0}
            onKeyDown={(e) => {
              const p = e.shiftKey ? 0.1 : 0.02;
              if (e.key === 'ArrowRight') aplicar(h, Math.min(1, s + p), v);
              else if (e.key === 'ArrowLeft') aplicar(h, Math.max(0, s - p), v);
              else if (e.key === 'ArrowUp') aplicar(h, s, Math.min(1, v + p));
              else if (e.key === 'ArrowDown') aplicar(h, s, Math.max(0, v - p));
              else return;
              e.preventDefault();
            }}>
            <span style={{ left: `${s * 100}%`, top: `${(1 - v) * 100}%`, background: valor }} />
          </div>
          <div className="seletor-matiz" onPointerDown={arrastar('matiz')} role="slider" aria-label="Matiz" aria-valuemin={0} aria-valuemax={360} aria-valuenow={Math.round(h)} tabIndex={0}
            onKeyDown={(e) => {
              const p = e.shiftKey ? 20 : 4;
              if (e.key === 'ArrowRight' || e.key === 'ArrowUp') aplicar((h + p) % 360, s, v);
              else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') aplicar((h - p + 360) % 360, s, v);
              else return;
              e.preventDefault();
            }}>
            <span style={{ left: `${(h / 360) * 100}%`, background: `hsl(${h} 100% 50%)` }} />
          </div>
          <label className="campo">
            <span>Código da cor</span>
            <input type="text" maxLength={7} value={texto} onChange={(e) => {
              const t = `#${e.target.value.replace(/[^0-9a-fA-F]/g, '').slice(0, 6)}`.toUpperCase();
              setTexto(t);
              if (t.length === 7) {
                setHsv(hexParaHsv(t));
                muda(t);
              }
            }} />
          </label>
        </span>
      ) : null}
    </span>
  );
}
