import { Abas } from './abas';

// Mesma abertura das outras páginas: título em dois tons e as abas logo abaixo.
export function CabecaCalculos({ titulo, cinza, texto }: { titulo: string; cinza: string; texto: string }) {
  return (
    <section className="heroi embrulho heroi-curto">
      <h1>{titulo} <em>{cinza}</em></h1>
      <p className="heroi-sub">{texto}</p>
      <div style={{ marginTop: 24 }}>
        <Abas rotulo="Cálculos" itens={[{ href: '/calculos/volta-do-almoco', nome: 'Volta do almoço' }, { href: '/calculos/horas-extras', nome: 'Horas extras' }]} />
      </div>
    </section>
  );
}
