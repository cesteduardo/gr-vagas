import type { Metadata } from 'next';
import { acaoApagarAlerta } from '@/app/acoes';
import { FormAlerta } from '@/components/forms-painel';
import { exigirCandidato } from '@/lib/auth/sessao';
import { cidadePorSlug } from '@/lib/config';
import { banco } from '@/lib/db/client';
import { alertasDe } from '@/lib/perfis';
import { limites, planoDe } from '@/lib/planos';

export const metadata: Metadata = { title: 'Alertas de vagas' };

export default async function Alertas() {
  const u = await exigirCandidato();
  const db = await banco();
  const lista = await alertasDe(db, u.id);
  const imediato = limites(await planoDe(db, u.id)).alertaImediato;
  return (
    <div className="pilha" style={{ maxWidth: 760 }}>
      <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3rem)' }}>Alertas de vagas</h1>
      <p className="leve">{imediato ? 'Avisamos por e-mail assim que surgir uma vaga parecida.' : 'Avisamos por e-mail uma vez por dia quando surgir uma vaga parecida.'}</p>
      <FormAlerta />
      {lista.length ? (
        <ul className="cartoes">
          {lista.map((a) => (
            <li key={a.id} className="cartao">
              <div><h2 style={{ fontSize: '1.25rem' }}>{a.termo}</h2><small>{cidadePorSlug(a.cidadeSlug)?.nome}</small></div>
              <form action={acaoApagarAlerta}><input type="hidden" name="id" value={a.id} /><button className="btn btn-claro btn-peq">Apagar alerta</button></form>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
