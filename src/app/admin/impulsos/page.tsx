import type { Metadata } from 'next';
import Link from 'next/link';
import { acaoAdminImpulso } from '@/app/acoes';
import { precoCurto } from '@/components/cartao-plano';
import { exigirAdmin } from '@/lib/auth/sessao';
import { banco } from '@/lib/db/client';
import { pedidosAbertos, vagasImpulsionadas } from '@/lib/impulsos';
import { formatarData, formatarHora } from '@/lib/texto';

export const metadata: Metadata = { title: 'Impulsos' };

function Botao({ id, fazer, rotulo, claro }: { id: string; fazer: string; rotulo: string; claro?: boolean }) {
  return (
    <form action={acaoAdminImpulso}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="fazer" value={fazer} />
      <button className={`btn btn-peq${claro ? ' btn-claro' : ''}`}>{rotulo}</button>
    </form>
  );
}

// Pedidos de impulso: confira o Pix, ponha no ar. Embaixo, o que já está na tela inicial.
export default async function AdminImpulsos() {
  await exigirAdmin();
  const db = await banco();
  const [pedidos, noAr] = [await pedidosAbertos(db), await vagasImpulsionadas(db)];
  return (
    <>
      <h1 className="titulo-painel" style={{ marginBottom: 8 }}>Impulsos</h1>
      <p className="leve" style={{ maxWidth: 680 }}>A empresa pede pela vaga e paga por Pix. Quando o pagamento cair, ponha no ar: a vaga entra na tela inicial pelo prazo pedido, somado ao que faltar.</p>
      <h2 className="subtitulo-painel">{pedidos.length === 1 ? '1 pedido esperando' : `${pedidos.length} pedidos esperando`}</h2>
      {pedidos.length ? (
        <ul className="cartoes">
          {pedidos.map((p) => (
            <li key={p.id} className="cartao">
              <div>
                <h3 style={{ fontSize: '1.15rem' }}><Link href={`/vagas/${p.vagaSlug}`} style={{ color: 'inherit' }}>{p.vagaTitulo}</Link></h3>
                <small>{p.empresa} · {p.dias} dias · {precoCurto(p.valorCentavos / 100)} · pedido em {formatarHora(p.criadoEm)}</small>
              </div>
              <div className="linha-botoes">
                <Botao id={p.id} fazer="no-ar" rotulo="Recebi, pôr no ar" />
                <Botao id={p.id} fazer="recusar" rotulo="Recusar" claro />
              </div>
            </li>
          ))}
        </ul>
      ) : <p className="vazio">Nenhum pedido esperando.</p>}
      <h2 className="subtitulo-painel">Na tela inicial agora</h2>
      {noAr.length ? (
        <ul className="cartoes">
          {noAr.map((v) => (
            <li key={v.id} className="cartao">
              <div>
                <h3 style={{ fontSize: '1.15rem' }}><Link href={`/vagas/${v.slug}`} style={{ color: 'inherit' }}>{v.titulo}</Link></h3>
                <small>{v.empresa} · até {formatarData(v.ate!)}</small>
              </div>
              <Botao id={v.id} fazer="tirar" rotulo="Tirar do ar" claro />
            </li>
          ))}
        </ul>
      ) : <p className="vazio">Nenhuma vaga impulsionada no ar.</p>}
    </>
  );
}
