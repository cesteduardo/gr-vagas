import type { Metadata } from 'next';
import Link from 'next/link';
import { exigirCandidato } from '@/lib/auth/sessao';
import { banco } from '@/lib/db/client';
import { vagasSalvas } from '@/lib/perfis';
import { rotuloEstado } from '@/lib/vagas';

export const metadata: Metadata = { title: 'Vagas salvas' };

export default async function Salvas() {
  const u = await exigirCandidato();
  const lista = await vagasSalvas(await banco(), u.id);
  return (
    <>
      <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3rem)', marginBottom: 20 }}>Vagas salvas</h1>
      {lista.length ? (
        <ul className="cartoes">
          {lista.map((v) => {
            const estado = rotuloEstado(v.estado, v.expiraEm);
            return (
              <li key={v.id} className="cartao">
                <div><h2 style={{ fontSize: '1.35rem' }}><Link href={`/vagas/${v.slug}`} style={{ color: 'inherit' }}>{v.titulo}</Link></h2><small>{v.empresa}, {v.cidade}. {v.contrato}.</small></div>
                {estado === 'Aberta' ? null : <span className="etiqueta etiqueta-neutra" style={{ margin: 0 }}>{estado}</span>}
                <Link className="btn btn-peq" href={`/vagas/${v.slug}`}>Ver vaga</Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="vazio"><h2 style={{ fontSize: '1.6rem' }}>Nenhuma vaga salva</h2><p className="leve">Salve as vagas que quiser ver de novo.</p><Link className="btn" href="/vagas">Ver vagas</Link></div>
      )}
    </>
  );
}
