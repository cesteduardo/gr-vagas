import type { Metadata } from 'next';
import Link from 'next/link';
import { exigirContratante } from '@/lib/auth/sessao';
import { naoLidas } from '@/lib/candidaturas';
import { banco } from '@/lib/db/client';
import { limites, planoDe } from '@/lib/planos';
import { formatarData } from '@/lib/texto';
import { rotuloEstado, vagasDaEmpresa } from '@/lib/vagas';

export const metadata: Metadata = { title: 'Painel' };

export default async function Painel() {
  const u = await exigirContratante();
  const db = await banco();
  const vagas = await vagasDaEmpresa(db, u.empresaId);
  const abertas = vagas.filter((v) => rotuloEstado(v.estado, v.expiraEm) === 'Aberta').length;
  const candidatos = vagas.reduce((n, v) => n + v.candidatos, 0);
  const novas = await naoLidas(db, u.id, 'empresa');
  const lim = limites(await planoDe(db, u.id));
  // Uma coisa de cada vez: o painel diz qual é o próximo passo.
  const proximo = !vagas.length
    ? { texto: 'Publique sua primeira vaga. Em poucos minutos a arte fica pronta.', href: '/publicar', acao: 'Publicar vaga' }
    : novas
      ? { texto: `Você tem ${novas === 1 ? '1 mensagem' : `${novas} mensagens`} para responder.`, href: `/painel/vagas/${vagas[0]!.id}`, acao: 'Ver candidatos' }
      : !candidatos
        ? { texto: 'Poste a arte para os candidatos chegarem até a vaga.', href: `/painel/vagas/${vagas[0]!.id}?aba=arte`, acao: 'Abrir a arte' }
        : null;
  return (
    <>
      <div className="cabeca-linha">
        <h1 className="titulo-painel">Início</h1>
        <Link className="btn" href="/publicar">Publicar vaga</Link>
      </div>
      {proximo ? <div className="proximo"><p>{proximo.texto}</p><Link className="btn btn-claro btn-peq" href={proximo.href}>{proximo.acao}</Link></div> : null}
      <dl className="numeros">
        <div><dt>Vagas abertas</dt><dd>{abertas}<small> de {lim.vagasAbertas}</small></dd></div>
        <div><dt>Candidatos</dt><dd>{candidatos}</dd></div>
        <div><dt>Mensagens novas</dt><dd>{novas}</dd></div>
      </dl>
      <h2 className="subtitulo-painel">Suas vagas</h2>
      {vagas.length ? (
        <ul className="cartoes">
          {vagas.map((v) => {
            const estado = rotuloEstado(v.estado, v.expiraEm);
            return (
              <li key={v.id} className="cartao">
                <div>
                  <h3><Link href={`/painel/vagas/${v.id}`} style={{ textDecoration: 'none' }}>{v.titulo}</Link>{v.destaque ? <span className="etiqueta">Destaque</span> : null}</h3>
                  <small>{v.cidade}. Vale até {formatarData(v.expiraEm)}.</small>
                </div>
                <span className={`etiqueta ${estado === 'Aberta' ? 'etiqueta-verde' : 'etiqueta-neutra'}`} style={{ margin: 0 }}>{estado}</span>
                <div className="linha-botoes">
                  <Link className="btn btn-claro btn-peq" href={`/painel/vagas/${v.id}`}>{v.candidatos === 1 ? '1 candidato' : `${v.candidatos} candidatos`}</Link>
                  <Link className="btn btn-claro btn-peq" href={`/painel/vagas/${v.id}?aba=arte`}>Arte</Link>
                </div>
              </li>
            );
          })}
        </ul>
      ) : <p className="vazio">Quando você publicar, suas vagas aparecem aqui.</p>}
    </>
  );
}
