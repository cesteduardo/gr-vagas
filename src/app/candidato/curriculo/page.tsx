import { BASE } from '@/lib/base';
import type { Metadata } from 'next';
import Link from 'next/link';
import { VisaoCurriculo } from '@/components/visao-curriculo';
import { exigirCandidato } from '@/lib/auth/sessao';
import { banco } from '@/lib/db/client';
import { perfilDe } from '@/lib/perfis';
import { limites, planoDe } from '@/lib/planos';

export const metadata: Metadata = { title: 'Currículo pronto' };

export default async function CurriculoPronto() {
  const u = await exigirCandidato();
  const db = await banco();
  const p = await perfilDe(db, u.id);
  const plus = limites(await planoDe(db, u.id)).plus;
  return (
    <div className="pilha">
      <div className="cabeca-linha nao-imprimir" style={{ marginBottom: 0 }}>
        <div>
          <h1 className="titulo-painel">Currículo pronto</h1>
          <p className="leve" style={{ marginTop: 6 }}>Montado com os dados do seu perfil. O PDF sai igual a esta folha, pronto para enviar.</p>
        </div>
        {plus ? <a className="btn" href={`${BASE}/api/curriculo/pronto`} download>Baixar PDF</a> : <Link className="btn" href="/candidato/plano">Liberar no Plus</Link>}
      </div>
      {p.titulo ? null : <p className="aviso nao-imprimir">Preencha o <Link href="/candidato/perfil">perfil</Link> para o currículo ficar completo.</p>}
      <div className={plus ? undefined : 'cv-previa'} aria-hidden={plus ? undefined : true}>
        <VisaoCurriculo nome={u.nome} email={u.email} telefone={u.telefone} titulo={p.titulo} cidadeSlug={p.cidadeSlug} resumo={p.resumo} cv={p.cv ?? {}} foto={p.temFoto ? `${BASE}/api/foto/${u.id}` : null} />
      </div>
    </div>
  );
}
