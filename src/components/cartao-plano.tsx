import type { ReactNode } from 'react';

type Plano = { id: string; nome: string; preco: number; resumo: string; itens: readonly string[] };

// Preço curto: R$ 49 em vez de R$ 49,00; centavos só quando existem (R$ 9,90).
export const precoCurto = (v: number) => (Number.isInteger(v) ? `R$ ${v}` : v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }));

// Cartão de plano igual em todo o site: página de planos, Para empresas e painel.
export function CartaoPlano({ plano, forte, etiqueta, acao }: { plano: Plano; forte?: boolean; etiqueta?: string; acao?: ReactNode }) {
  return (
    <article className={`plano${forte ? ' plano-forte' : ''}`}>
      <div className="plano-cabeca">
        <h3>{plano.nome}</h3>
        {etiqueta ? <span className="plano-etiqueta">{etiqueta}</span> : null}
      </div>
      <p className="plano-preco">{precoCurto(plano.preco)}<small>/mês</small></p>
      <p className="plano-resumo">{plano.resumo}</p>
      <ul>{plano.itens.map((i) => <li key={i}>{i}</li>)}</ul>
      {acao ? <div className="plano-acao">{acao}</div> : null}
    </article>
  );
}
