import { acaoAssinar, acaoCancelarPlano } from '@/app/acoes';
import { planosDoTipo, precoEmReais, SIMULADOR, type PlanoId } from '@/lib/config';
import { formatarData } from '@/lib/texto';

export function PlanoTela({ tipo, plano, assinatura, erro, ok }: { tipo: 'contratante' | 'candidato'; plano: PlanoId; assinatura: { estado: string; fimEm: Date } | null; erro?: string; ok?: boolean }) {
  const planos = planosDoTipo(tipo);
  return (
    <>
      {erro ? <p className="aviso aviso-erro" role="alert" style={{ marginBottom: 16 }}>{erro}</p> : null}
      {ok ? <p className="aviso aviso-ok" role="status" style={{ marginBottom: 16 }}>Plano ativado{SIMULADOR ? ' em modo de demonstração, sem cobrança' : ''}.</p> : null}
      {assinatura && plano !== 'gratis' ? (
        <div className="painel-caixa cabeca-linha">
          <p>
            {assinatura.estado === 'cancelada' ? `Cancelado. Seu plano vale até ${formatarData(assinatura.fimEm)}.` : `Seu plano renova em ${formatarData(assinatura.fimEm)}.`}
          </p>
          {assinatura.estado === 'ativa' ? <form action={acaoCancelarPlano}><button className="btn btn-claro btn-peq">Cancelar plano</button></form> : null}
        </div>
      ) : null}
      <div className="grade-planos">
        {planos.map((p) => (
          <article key={p.id} className={`plano${p.id === plano ? ' plano-forte' : ''}`}>
            <h2 style={{ fontSize: '1.6rem' }}>{p.nome}{p.id === plano ? <span className="etiqueta">Seu plano</span> : null}</h2>
            <div className="plano-preco">{p.preco ? precoEmReais(p.preco) : 'R$ 0'}<small> por mês</small></div>
            <p className="leve">{p.resumo}</p>
            <ul>{p.itens.map((i) => <li key={i}>{i}</li>)}</ul>
            {p.preco > 0 && p.id !== plano ? (
              SIMULADOR ? <form action={acaoAssinar}><input type="hidden" name="plano" value={p.id} /><button className="btn" style={{ width: '100%' }}>Assinar {p.nome} (simulado)</button></form> : <p className="nota">Assinatura disponível em breve.</p>
            ) : null}
          </article>
        ))}
      </div>
    </>
  );
}
