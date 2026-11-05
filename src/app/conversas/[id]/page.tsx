import { Selecao } from '@/components/selecao';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { acaoMudarEtapa } from '@/app/acoes';
import { Conversa } from '@/components/conversa';
import { Navegar } from '@/components/setas';
import { VisaoCurriculo } from '@/components/visao-curriculo';
import { EnvioAuto } from '@/components/envio-auto';
import { Rodape, Topo } from '@/components/moldura';
import { exigirUsuario } from '@/lib/auth/sessao';
import { acessoCandidatura, conversa, marcarLida } from '@/lib/candidaturas';
import { ETAPAS, RESPOSTAS_RAPIDAS } from '@/lib/config';
import { banco } from '@/lib/db/client';
import { formatarTelefone } from '@/lib/forms/validators';
import { apresentacao, perfilDe } from '@/lib/perfis';
import { limites, planoDe } from '@/lib/planos';
import { formatarHora, linkWhatsapp } from '@/lib/texto';

export const metadata: Metadata = { title: 'Conversa', robots: { index: false, follow: false } };

export default async function PaginaConversa({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const u = await exigirUsuario();
  const { id } = await params;
  const s = await searchParams;
  const db = await banco();
  const a = await acessoCandidatura(db, id, u.id);
  if (!a) notFound();
  const msgs = (await conversa(db, id, u.id)) ?? [];
  const perfilCandidato = a.papel === 'empresa' ? await perfilDe(db, a.candidatoId) : null;
  await marcarLida(db, a);
  const ehEmpresa = a.papel === 'empresa';
  const plus = !ehEmpresa && limites(await planoDe(db, u.id)).plus;
  const rapidas = ehEmpresa ? RESPOSTAS_RAPIDAS : plus ? [apresentacao({ nome: a.candidatoNome, titulo: a.perfilTitulo ?? '', resumo: a.perfilResumo ?? '', vaga: a.vagaTitulo, empresa: a.empresaNome })] : undefined;
  return (
    <>
      <Topo />
      <main className="pagina embrulho">
        <Navegar voltarPara={ehEmpresa ? '/painel/conversas' : '/candidato/conversas'} rotulo="Conversas" />
        <h1 style={{ fontSize: 'clamp(1.9rem, 5vw, 3rem)', marginBottom: 6 }}>{ehEmpresa ? a.candidatoNome : a.empresaNome}</h1>
        <p className="leve" style={{ marginBottom: 20 }}>Vaga: <Link href={`/vagas/${a.vagaSlug}`}>{a.vagaTitulo}</Link></p>
        {s.nova ? <p className="aviso aviso-ok" role="status" style={{ marginBottom: 16 }}>Candidatura enviada. A resposta da empresa aparece aqui e chega ao seu e-mail.</p> : null}
        <div className="conversa-grade">
          <Conversa id={id} minhaId={u.id} inicial={msgs.map((m) => ({ ...m, criadaEm: m.criadaEm.toISOString() }))} rapidas={rapidas} />
          <aside className="painel-caixa conversa-lado">
            {ehEmpresa ? (
              <div className="pilha">
                <dl className="fatos-lado">
                  <div><dt>WhatsApp</dt><dd>{formatarTelefone(a.candidatoTelefone)}</dd></div>
                  <div><dt>E-mail</dt><dd><a href={`mailto:${a.candidatoEmail}`}>{a.candidatoEmail}</a></dd></div>
                  {a.perfilTitulo ? <div><dt>O que faz</dt><dd>{a.perfilTitulo}</dd></div> : null}
                  {a.perfilResumo ? <div><dt>Experiência</dt><dd style={{ fontWeight: 400, whiteSpace: 'pre-line' }}>{a.perfilResumo}</dd></div> : null}
                </dl>
                <Link className="btn btn-claro" href={`/candidatos/${a.candidatoId}`}>Ver perfil completo</Link>
                <EnvioAuto action={acaoMudarEtapa}>
                  <input type="hidden" name="candidaturaId" value={a.candidaturaId} />
                  <label className="campo"><span>Etapa</span><Selecao name="etapa" defaultValue={a.etapa}>{ETAPAS.map((e) => <option key={e.id} value={e.id}>{e.rotulo}</option>)}</Selecao></label>
                </EnvioAuto>
                {a.temCurriculo ? <a className="btn btn-claro" href={`/api/curriculo/${a.candidatoId}?candidatura=${a.candidaturaId}`}>Baixar currículo</a> : <p className="nota">Sem currículo em PDF. Você pode pedir nesta conversa.</p>}
                <a className="btn btn-claro" href={linkWhatsapp(a.candidatoTelefone, `Olá, ${a.candidatoNome}! Vi sua candidatura para a vaga de ${a.vagaTitulo}.`)} target="_blank" rel="noopener">Continuar no WhatsApp</a>
              </div>
            ) : (
              <dl className="fatos-lado">
                <div><dt>Etapa</dt><dd>{ETAPAS.find((e) => e.id === a.etapa)?.rotulo}</dd></div>
                <div><dt>A empresa abriu sua candidatura?</dt><dd>{plus ? (a.vistaEm ? `Sim, em ${formatarHora(a.vistaEm)}` : 'Ainda não') : <Link href="/candidato/plano">Disponível no Plus</Link>}</dd></div>
                {plus ? null : <div><dt>Apresentação pronta para esta vaga</dt><dd><Link href="/candidato/plano">Disponível no Plus</Link></dd></div>}
                <div><dt>Segurança</dt><dd style={{ fontWeight: 400 }}>Nunca pague para concorrer a uma vaga. Se pedirem dinheiro, <Link href={`/vagas/${a.vagaSlug}`}>denuncie a vaga</Link>.</dd></div>
              </dl>
            )}
          </aside>
        </div>
        {perfilCandidato ? (
          <details className="caixa-dobra cv-dobra">
            <summary>Ver o currículo completo de {a.candidatoNome.split(' ')[0]}</summary>
            <VisaoCurriculo nome={a.candidatoNome} email={a.candidatoEmail} telefone={a.candidatoTelefone} titulo={perfilCandidato.titulo} cidadeSlug={perfilCandidato.cidadeSlug} resumo={perfilCandidato.resumo} cv={perfilCandidato.cv ?? {}} foto={perfilCandidato.temFoto ? `/api/foto/${a.candidatoId}` : null} />
          </details>
        ) : null}
      </main>
      <Rodape />
    </>
  );
}
