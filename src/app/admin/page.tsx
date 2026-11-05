import type { Metadata } from 'next';
import Link from 'next/link';
import { acaoAnuncio } from '@/app/acoes';
import { Selecao } from '@/components/selecao';
import { exigirAdmin } from '@/lib/auth/sessao';
import { banco } from '@/lib/db/client';
import { empresasParaAdmin } from '@/lib/vagas';

export const metadata: Metadata = { title: 'Tela inicial' };

const PRAZOS = [7, 15, 30, 90];
const data = (d: Date) => d.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });

export default async function AdminTelaInicial({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await exigirAdmin();
  const q = (await searchParams).q ?? '';
  const agora = new Date();
  const lista = await empresasParaAdmin(await banco(), q, agora);
  const noAr = lista.filter((e) => e.anuncioAte && e.anuncioAte > agora).length;
  return (
    <>
      <div className="cabeca-linha" style={{ marginBottom: 8 }}>
        <h1 className="titulo-painel">Tela inicial</h1>
        <Link className="btn btn-claro btn-peq" href="/" target="_blank">Ver a tela inicial</Link>
      </div>
      <p className="leve" style={{ maxWidth: 680 }}>Na tela inicial só aparecem as empresas com anúncio no ar, e as vagas delas. Quando receber o pagamento, escolha o prazo e ponha no ar. Se já estiver no ar, o prazo é somado ao que falta.</p>
      <form className="admin-busca" role="search">
        <label className="campo"><span>Procurar empresa</span><input type="search" name="q" defaultValue={q} placeholder="Nome da empresa" /></label>
        <button className="btn btn-claro">Procurar</button>
      </form>
      <p className="nota" style={{ margin: '14px 0 10px' }}>{noAr === 1 ? '1 empresa no ar agora.' : `${noAr} empresas no ar agora.`}</p>
      {lista.length ? (
        <ul className="cartoes">
          {lista.map((e) => {
            const ativo = Boolean(e.anuncioAte && e.anuncioAte > agora);
            const venceu = Boolean(e.anuncioAte && !ativo);
            return (
              <li key={e.id} className="cartao admin-anuncio">
                <span className="conversa-foto" aria-hidden="true">{e.temLogo ? <img src={`/api/logo/${e.id}`} alt="" width={48} height={48} loading="lazy" /> : e.nome.charAt(0).toUpperCase()}</span>
                <div>
                  <h2 style={{ fontSize: '1.2rem' }}><Link href={`/empresas/${e.slug}`} style={{ color: 'inherit' }}>{e.nome}</Link></h2>
                  <small>{e.abertas === 1 ? '1 vaga aberta' : `${e.abertas} vagas abertas`} · {e.email}</small>
                  <div style={{ marginTop: 6 }}>
                    {ativo ? <span className="etiqueta etiqueta-verde" style={{ margin: 0 }}>No ar até {data(e.anuncioAte!)}</span> : venceu ? <span className="etiqueta etiqueta-neutra" style={{ margin: 0 }}>Venceu em {data(e.anuncioAte!)}</span> : <span className="etiqueta etiqueta-neutra" style={{ margin: 0 }}>Fora da tela inicial</span>}
                    {ativo && !e.abertas ? <span className="nota" style={{ marginLeft: 8 }}>Sem vaga aberta: só aparece quando publicar.</span> : null}
                    {ativo && !e.confirmada ? <span className="nota" style={{ marginLeft: 8 }}>E-mail não confirmado: não aparece até confirmar.</span> : null}
                  </div>
                </div>
                <div className="linha-botoes">
                  <form action={acaoAnuncio} className="linha-botoes">
                    <input type="hidden" name="empresaId" value={e.id} />
                    <Selecao name="dias" defaultValue="30" aria-label="Prazo">{PRAZOS.map((d) => <option key={d} value={String(d)}>{`${d} dias`}</option>)}</Selecao>
                    <button className="btn btn-peq">{ativo ? 'Estender' : 'Pôr no ar'}</button>
                  </form>
                  {ativo ? (
                    <form action={acaoAnuncio}>
                      <input type="hidden" name="empresaId" value={e.id} />
                      <input type="hidden" name="tirar" value="1" />
                      <button className="btn btn-claro btn-peq">Tirar do ar</button>
                    </form>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      ) : <p className="vazio">Nenhuma empresa encontrada.</p>}
    </>
  );
}
