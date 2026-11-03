'use client';

import { usePathname } from 'next/navigation';
import { Abas } from './abas';

const PAGINAS = [
  { href: '/calculos/volta-do-almoco', nome: 'Volta do almoço', titulo: 'Volta do almoço.', cinza: 'Sem fazer conta.', texto: 'Diga que horas você saiu. A gente mostra a hora de voltar e a de ir embora.' },
  { href: '/calculos/horas-extras', nome: 'Horas extras', titulo: 'Horas extras.', cinza: 'Na ponta do lápis.', texto: 'Veja quanto vai receber no mês ou confira o que fez hoje pelo horário de ponto.' },
];

// Fica no layout de Cálculos, e não em cada página: assim as abas continuam montadas ao trocar
// de cálculo e a pílula desliza, como nas abas de dentro de Horas extras. Só o texto entra de novo.
export function CabecaCalculos() {
  const atual = usePathname();
  const p = PAGINAS.find((x) => atual.startsWith(x.href)) ?? PAGINAS[0]!;
  return (
    <section className="heroi embrulho heroi-curto">
      <div key={p.href} className="heroi-texto">
        {/* Sempre em duas linhas, uma sobre a outra, qualquer que seja o tamanho do título */}
        <h1>{p.titulo}<br /><em>{p.cinza}</em></h1>
        <p className="heroi-sub">{p.texto}</p>
      </div>
      <div style={{ marginTop: 24 }}>
        <Abas rotulo="Cálculos" itens={PAGINAS.map(({ href, nome }) => ({ href, nome }))} />
      </div>
    </section>
  );
}
