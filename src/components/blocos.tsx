import type { ReactNode } from 'react';

// Peças comuns a todas as páginas: abertura, folha branca e perguntas frequentes.
export function Hero({ titulo, cinza, texto, children, lado }: { titulo: string; cinza?: string; texto?: string; children?: ReactNode; lado?: ReactNode }) {
  const corpo = (
    <div>
      <h1>{titulo}{cinza ? <> <em>{cinza}</em></> : null}</h1>
      {texto ? <p className="heroi-sub">{texto}</p> : null}
      {children}
    </div>
  );
  return <section className="heroi embrulho">{lado ? <div className="heroi-grade">{corpo}{lado}</div> : corpo}</section>;
}

export function Folha({ children }: { children: ReactNode }) {
  return <div className="folha">{children}</div>;
}

export function Perguntas({ itens, titulo = 'Perguntas', cinza = 'frequentes' }: { itens: { p: string; r: string }[]; titulo?: string; cinza?: string }) {
  return (
    <section className="secao embrulho perguntas">
      <div className="secao-cabeca centro"><h2>{titulo} <em>{cinza}</em></h2></div>
      <div className="faq">{itens.map((f) => <details key={f.p}><summary>{f.p}</summary><p>{f.r}</p></details>)}</div>
    </section>
  );
}
