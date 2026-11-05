import { BASE } from '@/lib/base';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { Rodape, Topo } from '@/components/moldura';
import { usuarioAtual } from '@/lib/auth/sessao';
import { cidadePorSlug } from '@/lib/config';
import { periodo } from '@/lib/curriculo';
import { banco } from '@/lib/db/client';
import { perfilParaEmpresa } from '@/lib/perfis';

export const metadata: Metadata = { title: 'Perfil do candidato', robots: { index: false, follow: false } };

type P = { params: Promise<{ id: string }> };

// Perfil profissional do candidato, aberto só a empresas com conta (e a ele mesmo).
// Contato não aparece aqui: chega pela candidatura ou pelo banco de talentos.
export default async function PerfilCandidato({ params }: P) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const u = await usuarioAtual();
  if (!u) redirect(`/entrar?destino=${encodeURIComponent(`/candidatos/${id}`)}`);
  const p = await perfilParaEmpresa(await banco(), u.id, id);
  if (!p) notFound();
  const proprio = u.id === id;
  const cidade = cidadePorSlug(p.cidadeSlug);
  const primeiro = p.nome.split(' ')[0];
  const cv = p.cv;
  return (
    <>
      <Topo />
      <main className="pagina embrulho">
        {proprio ? (
          <p className="aviso aviso-linha" role="status">
            {p.visivel ? 'É assim que as empresas com conta veem o seu perfil. Telefone, e-mail e endereço não aparecem.' : 'Seu perfil está escondido: só as empresas que receberam a sua candidatura veem esta página.'}{' '}
            <Link href="/candidato/perfil">Editar perfil</Link>
          </p>
        ) : null}
        <div className="candidato-grade">
          <div className="pilha">
            <header className="painel-caixa candidato-topo">
              {p.temFoto ? <img className="perfil-avatar" src={`${BASE}/api/foto/${id}`} alt={`Foto de ${p.nome}`} width={104} height={104} /> : <span className="perfil-avatar perfil-avatar-inicial" aria-hidden="true">{p.nome.charAt(0).toUpperCase()}</span>}
              <div>
                <h1>{p.nome}</h1>
                <p>{[p.titulo, cidade ? `${cidade.nome} - ${cidade.uf}` : ''].filter(Boolean).join(' · ')}</p>
              </div>
              {cv.habilidades?.length ? <ul className="candidato-habilidades" aria-label="Habilidades">{cv.habilidades.map((h) => <li key={h} className="etiqueta etiqueta-neutra">{h}</li>)}</ul> : null}
            </header>
            {cv.objetivo || p.resumo ? (
              <section className="painel-caixa candidato-secao">
                <h2>Sobre</h2>
                {cv.objetivo ? <p><strong>Objetivo:</strong> {cv.objetivo}</p> : null}
                {p.resumo ? <p>{p.resumo}</p> : null}
              </section>
            ) : null}
            {cv.experiencias?.length ? (
              <section className="painel-caixa candidato-secao">
                <h2>Experiência</h2>
                <ol className="candidato-linha-tempo">
                  {cv.experiencias.map((e, i) => (
                    <li key={i}>
                      <strong>{e.cargo}</strong>
                      <span>{[e.empresa, periodo(e.inicio, e.fim, e.atual)].filter(Boolean).join(' · ')}</span>
                      {e.descricao ? <p>{e.descricao}</p> : null}
                    </li>
                  ))}
                </ol>
              </section>
            ) : null}
            {cv.formacao?.length ? (
              <section className="painel-caixa candidato-secao">
                <h2>Formação</h2>
                <ol className="candidato-linha-tempo">
                  {cv.formacao.map((f, i) => (
                    <li key={i}>
                      <strong>{f.curso}</strong>
                      <span>{[f.instituicao, periodo(f.inicio, f.fim)].filter(Boolean).join(' · ')}</span>
                      {f.descricao ? <p>{f.descricao}</p> : null}
                    </li>
                  ))}
                </ol>
              </section>
            ) : null}
            {cv.idiomas?.length ? (
              <section className="painel-caixa candidato-secao">
                <h2>Idiomas</h2>
                <p>{cv.idiomas.map((i) => `${i.lingua} (${i.nivel.toLowerCase()})`).join(', ')}</p>
              </section>
            ) : null}
          </div>
          {proprio ? null : (
            <aside className="painel-caixa candidato-contato">
              <h2>Falar com {primeiro}</h2>
              {p.conversas.length ? (
                <>
                  <p className="leve">{primeiro} se candidatou {p.conversas.length === 1 ? 'a uma vaga sua' : `a ${p.conversas.length} vagas suas`}.</p>
                  {p.conversas.map((c) => <Link key={c.id} className="btn btn-peq" href={`/conversas/${c.id}`}>Conversa: {c.vaga}</Link>)}
                </>
              ) : p.noBanco ? (
                <>
                  <p className="leve">{primeiro} está no banco de talentos: o contato aparece lá.</p>
                  <Link className="btn btn-peq" href={`/painel/talentos?q=${encodeURIComponent(p.titulo)}`}>Ver no banco de talentos</Link>
                </>
              ) : (
                <>
                  <p className="leve">O contato aparece quando {primeiro} se candidata a uma vaga sua, ou no banco de talentos dos planos pagos, se aceitou aparecer lá.</p>
                  <Link className="btn btn-claro btn-peq" href={`/painel/plano`}>Ver os planos</Link>
                </>
              )}
            </aside>
          )}
        </div>
      </main>
      <Rodape />
    </>
  );
}
