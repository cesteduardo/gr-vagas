import type { Metadata } from 'next';
import Link from 'next/link';
import { exigirCandidato } from '@/lib/auth/sessao';
import { candidaturasDoCandidato, naoLidas } from '@/lib/candidaturas';
import { ETAPAS } from '@/lib/config';
import { banco } from '@/lib/db/client';
import { perfilDe } from '@/lib/perfis';
import { formatarData, formatarSalario } from '@/lib/texto';
import { vagasQueCombinam } from '@/lib/vagas';

export const metadata: Metadata = { title: 'Sua conta' };

export default async function InicioCandidato() {
  const u = await exigirCandidato();
  const db = await banco();
  const lista = await candidaturasDoCandidato(db, u.id);
  const novas = await naoLidas(db, u.id, 'candidato');
  const perfil = await perfilDe(db, u.id);
  const jaFoi = new Set(lista.map((c) => c.vagaSlug));
  const sugeridas = (await vagasQueCombinam(db, { titulo: perfil.titulo, texto: perfil.resumo, cidadeSlug: perfil.cidadeSlug }, 8)).filter((v) => !jaFoi.has(v.slug)).slice(0, 4);
  const proximo = novas
    ? { texto: `A empresa respondeu: ${novas === 1 ? '1 mensagem nova' : `${novas} mensagens novas`}.`, href: `/conversas/${lista.find((c) => c.naoLidas)?.id ?? lista[0]?.id}`, acao: 'Abrir conversa' }
    : !perfil.titulo || !perfil.curriculoNome
      ? { texto: 'Complete seu perfil e envie o currículo: as empresas veem junto com a candidatura.', href: '/candidato/perfil', acao: 'Completar perfil' }
      : !lista.length
        ? { texto: 'Você ainda não se candidatou. Veja as vagas abaixo.', href: '/vagas', acao: 'Ver todas as vagas' }
        : null;
  return (
    <>
      <div className="cabeca-linha">
        <h1 className="titulo-painel">Início</h1>
        <Link className="btn" href="/vagas">Ver vagas</Link>
      </div>
      {proximo ? <div className="proximo"><p>{proximo.texto}</p><Link className="btn btn-claro btn-peq" href={proximo.href}>{proximo.acao}</Link></div> : null}
      <h2 className="subtitulo-painel">Suas candidaturas</h2>
      {lista.length ? (
        <ul className="cartoes">
          {lista.map((c) => (
            <li key={c.id} className="cartao">
              <div>
                <h3><Link href={`/conversas/${c.id}`} style={{ textDecoration: 'none' }}>{c.vagaTitulo}</Link>{c.naoLidas ? <span className="etiqueta etiqueta-erro">{c.naoLidas === 1 ? '1 não lida' : `${c.naoLidas} não lidas`}</span> : null}</h3>
                <small>{c.empresa}, {c.cidade}. Candidatura em {formatarData(c.criadaEm)}.</small>
              </div>
              <span className="etiqueta etiqueta-neutra" style={{ margin: 0 }}>{ETAPAS.find((e) => e.id === c.etapa)?.rotulo}</span>
              <Link className="btn btn-peq" href={`/conversas/${c.id}`}>Abrir conversa</Link>
            </li>
          ))}
        </ul>
      ) : <p className="vazio">Suas candidaturas aparecem aqui.</p>}
      {sugeridas.length ? (
        <>
          <h2 className="subtitulo-painel">Vagas para você</h2>
          <ul className="cartoes">
            {sugeridas.map((v) => (
              <li key={v.id} className="cartao">
                <div><h3><Link href={`/vagas/${v.slug}`} style={{ textDecoration: 'none' }}>{v.titulo}</Link></h3><small>{v.empresaNome}, {v.cidade}. {formatarSalario(v.salarioCentavos)}.</small></div>
                <Link className="btn btn-claro btn-peq" href={`/vagas/${v.slug}`}>Ver vaga</Link>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </>
  );
}
