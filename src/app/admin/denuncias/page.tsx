import type { Metadata } from 'next';
import Link from 'next/link';
import { acaoResolverDenuncia } from '@/app/acoes';
import { exigirAdmin } from '@/lib/auth/sessao';
import { banco } from '@/lib/db/client';
import { formatarHora } from '@/lib/texto';
import { denunciasAbertas } from '@/lib/vagas';

export const metadata: Metadata = { title: 'Denúncias' };

export default async function Denuncias() {
  await exigirAdmin();
  const lista = await denunciasAbertas(await banco());
  return (
    <>
        <h1 className="titulo-painel" style={{ marginBottom: 20 }}>Denúncias abertas</h1>
        {lista.length ? (
          <ul className="cartoes">
            {lista.map((d) => (
              <li key={d.id} className="cartao">
                <div>
                  <h2 style={{ fontSize: '1.3rem' }}><Link href={`/vagas/${d.slug}`} style={{ color: 'inherit' }}>{d.titulo}</Link></h2>
                  <small>{d.empresa}. {formatarHora(d.criadaEm)}.</small>
                  <p style={{ marginTop: 6, whiteSpace: 'pre-line' }}>{d.motivo}</p>
                </div>
                <div className="linha-botoes">
                  <form action={acaoResolverDenuncia}><input type="hidden" name="id" value={d.id} /><button className="btn btn-claro btn-peq">Arquivar</button></form>
                  <form action={acaoResolverDenuncia}><input type="hidden" name="id" value={d.id} /><input type="hidden" name="encerrar" value="1" /><button className="btn btn-perigo btn-peq">Encerrar vaga</button></form>
                </div>
              </li>
            ))}
          </ul>
        ) : <p className="vazio">Nenhuma denúncia aberta.</p>}
    </>
  );
}
