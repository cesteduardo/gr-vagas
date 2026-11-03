'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

// Termos e privacidade abrem em pop-up, sem sair da página.
// O <dialog> vai para o <body> por portal: o link costuma estar dentro de um <p>, onde ele não pode ficar.
export function LinkLegal({ rotulo, titulo, children }: { rotulo: string; titulo: string; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [aberto, setAberto] = useState(false);

  useEffect(() => {
    const d = ref.current;
    if (!aberto || !d) return;
    if (!d.open) d.showModal();
    const fechar = (e: MouseEvent) => { if (e.target === d) d.close(); };
    const fechou = () => setAberto(false);
    d.addEventListener('click', fechar);
    d.addEventListener('close', fechou);
    return () => { d.removeEventListener('click', fechar); d.removeEventListener('close', fechou); };
  }, [aberto]);

  return (
    <>
      <button type="button" className="link-legal" aria-haspopup="dialog" onClick={() => setAberto(true)}>{rotulo}</button>
      {aberto ? createPortal(
        <dialog ref={ref} className="modal-legal" aria-label={titulo}>
          <div className="modal-topo">
            <h2>{titulo}</h2>
            <button type="button" className="seta" aria-label="Fechar" onClick={() => ref.current?.close()}>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
            </button>
          </div>
          <div className="modal-corpo">{children}</div>
        </dialog>,
        document.body,
      ) : null}
    </>
  );
}
