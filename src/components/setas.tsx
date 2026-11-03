'use client';

import { useRouter } from 'next/navigation';

const Seta = ({ lado }: { lado: 'esq' | 'dir' }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true"><path d={lado === 'esq' ? 'M14.5 5.5 8 12l6.5 6.5' : 'M9.5 5.5 16 12l-6.5 6.5'} /></svg>
);

export function BotaoSeta({ lado, rotulo, onClick, disabled }: { lado: 'esq' | 'dir'; rotulo: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button type="button" className="seta" aria-label={rotulo} onClick={onClick} disabled={disabled}>
      <Seta lado={lado} />
    </button>
  );
}

// Voltar e avançar como no navegador; sem histórico, voltar leva ao lugar de origem.
export function Navegar({ voltarPara, rotulo }: { voltarPara: string; rotulo: string }) {
  const router = useRouter();
  return (
    <div className="navegar">
      <BotaoSeta lado="esq" rotulo={`Voltar: ${rotulo}`} onClick={() => (window.history.length > 1 ? router.back() : router.push(voltarPara))} />
      <BotaoSeta lado="dir" rotulo="Avançar" onClick={() => router.forward()} />
      <a className="navegar-rotulo" href={voltarPara}>{rotulo}</a>
    </div>
  );
}
