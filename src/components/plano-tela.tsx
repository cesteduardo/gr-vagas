import { acaoAssinar, acaoCancelarPlano } from '@/app/acoes';
import { LIMITES, planosDoTipo, SIMULADOR, type PlanoId } from '@/lib/config';
import { asaasLigado } from '@/lib/pagamentos/asaas';
import { formatarData } from '@/lib/texto';
import { CartaoPlano, precoCurto } from './cartao-plano';

type Uso = { abertas: number; destaques: number };

function Medida({ rotulo, usado, total }: { rotulo: string; usado: number; total: number }) {
  const parte = total ? Math.min(100, Math.round((usado / total) * 100)) : 0;
  return (
    <li>
      <span>{rotulo}</span>
      <b>{total ? `${usado} de ${total}` : 'Não incluído'}</b>
      {total ? <i className={parte >= 100 ? 'cheio' : undefined} style={{ ['--p' as string]: `${parte}%` }} aria-hidden="true" /> : null}
    </li>
  );
}

// Painel do plano: primeiro o que a pessoa tem e quanto já usa; depois só os outros planos, cada um com a sua ação.
export function PlanoTela({ tipo, plano, assinatura, uso, erro, ok, pago: voltouPago }: { tipo: 'contratante' | 'candidato'; plano: PlanoId; assinatura: { estado: string; fimEm: Date; provedor?: string } | null; uso?: Uso; erro?: string; ok?: boolean; pago?: boolean }) {
  const asaas = asaasLigado();
  const ligado = asaas || SIMULADOR;
  const notaPagamento = asaas ? 'Pix ou cartão, na página segura do Asaas.' : 'Demonstração: sem cobrança.';
  const planos = planosDoTipo(tipo);
  const atual = planos.find((p) => p.id === plano) ?? planos[0]!;
  const lim = LIMITES[plano];
  const pago = plano !== 'gratis' && assinatura;
  const outros = planos.filter((p) => p.id !== plano);
  // No Asaas cada mês é pago à parte: "vale até", e um lembrete chega três dias antes.
  const mensal = assinatura?.provedor === 'asaas';
  const situacao = !pago ? 'Grátis, sem prazo.' : assinatura.estado === 'cancelada' ? `Cancelado: vale até ${formatarData(assinatura.fimEm)}.` : mensal ? `Vale até ${formatarData(assinatura.fimEm)}.` : `Renova em ${formatarData(assinatura.fimEm)}.`;
  return (
    <>
      {erro ? <p className="aviso aviso-erro" role="alert" style={{ marginBottom: 16 }}>{erro}</p> : null}
      {ok ? <p className="aviso aviso-ok" role="status" style={{ marginBottom: 16 }}>Plano ativado{SIMULADOR ? ' em modo de demonstração, sem cobrança' : ''}.</p> : null}
      {voltouPago ? <p className="aviso aviso-ok" role="status" style={{ marginBottom: 16 }}>Pagamento enviado. O plano é liberado assim que o Asaas confirmar: no Pix, em geral em segundos. Recarregue a página se ainda não mudou.</p> : null}
      <section className="plano-atual" aria-labelledby="t-plano-atual">
        <div className="plano-atual-topo">
          <div>
            <span className="plano-atual-rotulo">Seu plano</span>
            <h2 id="t-plano-atual">{atual.nome}</h2>
            <p>{atual.preco ? `${precoCurto(atual.preco)} por mês. ` : ''}{situacao}</p>
          </div>
          {pago && assinatura.estado === 'ativa' ? <form action={acaoCancelarPlano}><button className="btn btn-claro btn-peq">Cancelar plano</button></form> : null}
          {pago && (assinatura.estado === 'cancelada' || mensal) && ligado ? <form action={acaoAssinar}><input type="hidden" name="plano" value={plano} /><button className="btn btn-peq">{mensal && assinatura.estado !== 'cancelada' ? 'Pagar mais um mês' : `Continuar no ${atual.nome}`}</button></form> : null}
        </div>
        {uso ? (
          <ul className="plano-uso">
            <Medida rotulo="Vagas abertas" usado={uso.abertas} total={lim.vagasAbertas} />
            <Medida rotulo="Vagas em destaque" usado={uso.destaques} total={lim.destaques} />
            <li><span>Banco de talentos</span><b>{lim.talentos ? 'Incluído' : 'No Profissional'}</b></li>
            <li><span>Arte</span><b>{lim.marcaNaArte ? 'Com a marca do GR Vagas' : 'Sem a marca do GR Vagas'}</b></li>
          </ul>
        ) : (
          <ul className="plano-itens">{atual.itens.map((i) => <li key={i}>{i}</li>)}</ul>
        )}
      </section>

      <h2 className="subtitulo-painel">{plano === 'gratis' ? 'Para ir além' : 'Outros planos'}</h2>
      <div className={`grade-planos ${outros.length >= 2 ? 'planos-2' : 'planos-1'}`} style={{ marginTop: 0 }}>
        {outros.map((p) => (
          <CartaoPlano
            key={p.id}
            plano={p}
            forte={p.preco > atual.preco && p.id === outros.find((o) => o.preco > atual.preco)?.id}
            acao={p.preco > 0 ? (
              ligado ? (
                <form action={acaoAssinar}>
                  <input type="hidden" name="plano" value={p.id} />
                  <button className="btn">{p.preco > atual.preco ? `Mudar para o ${p.nome}` : `Trocar pelo ${p.nome}`}</button>
                  <p className="plano-simulado">{notaPagamento}</p>
                </form>
              ) : <p className="nota">Assinatura disponível em breve.</p>
            ) : <p className="nota">{pago && assinatura.estado === 'cancelada' ? `Você volta para o Grátis em ${formatarData(assinatura.fimEm)}.` : 'Para voltar ao Grátis, cancele o plano atual. Ele vale até o fim do período pago.'}</p>}
          />
        ))}
      </div>
      <p className="planos-pagamento">Pague por Pix, boleto ou cartão. Sem fidelidade.</p>
    </>
  );
}
