import { acaoCancelarImpulso, acaoPedirImpulso } from '@/app/acoes';
import { IMPULSOS, SIMULADOR } from '@/lib/config';
import { formatarData } from '@/lib/texto';
import { BotaoCopiar } from './botao-copiar';
import { precoCurto } from './cartao-plano';

type Situacao = { noArAte: Date | null; pedido: { id: string; dias: number; valorCentavos: number; criadoEm: Date } | null };

// Aba Impulsionar da vaga: escolher o prazo, pagar por Pix e esperar o administrador pôr no ar.
export function ImpulsoVaga({ vagaId, aberta, situacao, pedidoNovo, erro }: { vagaId: string; aberta: boolean; situacao: Situacao; pedidoNovo?: boolean; erro?: string }) {
  const chave = process.env.PIX_CHAVE?.trim();
  const { noArAte, pedido } = situacao;
  return (
    <div className="impulso">
      <section className="painel-caixa impulso-cabeca">
        <h2>Impulsione esta vaga</h2>
        <p className="leve">Ela aparece na tela inicial do GR Vagas, em destaque, para quem chega procurando emprego. Vale para qualquer plano.</p>
        {noArAte ? <p className="aviso aviso-ok" role="status">Na tela inicial até {formatarData(noArAte)}. Se pedir mais dias, eles são somados.</p> : null}
      </section>
      {erro ? <p className="aviso aviso-erro" role="alert">{erro}</p> : null}

      {pedido ? (
        <section className="painel-caixa impulso-pix" aria-labelledby="t-pix">
          <h3 id="t-pix">{pedidoNovo ? 'Pedido enviado. Falta o pagamento.' : 'Esperando o pagamento'}</h3>
          <p className="leve">{pedido.dias} dias de impulso, pedidos em {formatarData(pedido.criadoEm)}. Assim que o pagamento cair, a vaga entra no ar e o prazo aparece aqui.</p>
          <dl className="impulso-valor">
            <div><dt>Valor</dt><dd>{precoCurto(pedido.valorCentavos / 100)}</dd></div>
            {chave ? <div><dt>Chave Pix</dt><dd className="impulso-chave"><code>{chave}</code><BotaoCopiar texto={chave} rotulo="Copiar chave" copiado="Chave copiada" /></dd></div> : null}
          </dl>
          {chave ? null : <p className="nota">Vamos falar com você pelo WhatsApp do cadastro para combinar o pagamento por Pix.</p>}
          {SIMULADOR ? <p className="nota">Demonstração: entre com a conta de administração para pôr no ar.</p> : null}
          <form action={acaoCancelarImpulso}>
            <input type="hidden" name="vagaId" value={vagaId} />
            <input type="hidden" name="pedidoId" value={pedido.id} />
            <button className="btn btn-claro btn-peq">Cancelar o pedido</button>
          </form>
        </section>
      ) : aberta ? (
        <form action={acaoPedirImpulso} className="painel-caixa impulso-pedido">
          <input type="hidden" name="vagaId" value={vagaId} />
          <fieldset className="impulso-opcoes">
            <legend>Por quanto tempo?</legend>
            {IMPULSOS.map((i, n) => (
              <label key={i.dias} className="impulso-opcao">
                <input className="so-leitor" type="radio" name="dias" value={i.dias} defaultChecked={n === 1} />
                <strong>{i.dias} dias</strong>
                <span>{precoCurto(i.preco)}</span>
              </label>
            ))}
          </fieldset>
          <div className="linha-botoes">
            <button className="btn">{noArAte ? 'Pedir mais dias' : 'Pedir impulso'}</button>
            <span className="nota">Pagamento por Pix. Você só paga depois de pedir.</span>
          </div>
        </form>
      ) : (
        <p className="vazio">Só dá para impulsionar uma vaga aberta. Reabra a vaga para pedir.</p>
      )}
    </div>
  );
}
