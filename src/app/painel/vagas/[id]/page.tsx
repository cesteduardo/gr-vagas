import { BASE } from '@/lib/base';
import { Selecao } from '@/components/selecao';
import type { Metadata } from 'next';
import Link from 'next/link';
import { AbasLinks } from '@/components/abas';
import { eq } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { acaoDestaque, acaoEstadoVaga, acaoMudarEtapa } from '@/app/acoes';
import { EditorArte } from '@/components/editor-arte';
import { ImpulsoVaga } from '@/components/impulso-vaga';
import { situacaoDoImpulso } from '@/lib/impulsos';
import { Navegar } from '@/components/setas';
import { EnvioAuto } from '@/components/envio-auto';
import { FormEditarVaga } from '@/components/forms-painel';
import { exigirContratante } from '@/lib/auth/sessao';
import { candidaturasDaVaga } from '@/lib/candidaturas';
import { ETAPAS, URL_SITE } from '@/lib/config';
import { banco } from '@/lib/db/client';
import { empresas } from '@/lib/db/schema';
import { limites, planoDe } from '@/lib/planos';
import { formatarData, formatarSalario, linkWhatsapp } from '@/lib/texto';
import { rotuloEstado, vagaAceitaCandidatura, vagaDaEmpresa } from '@/lib/vagas';

export const metadata: Metadata = { title: 'Vaga' };
const uuid = /^[0-9a-f-]{36}$/i;

export default async function VagaPainel({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const u = await exigirContratante();
  const { id } = await params;
  const s = await searchParams;
  if (!uuid.test(id)) notFound();
  const db = await banco();
  const v = await vagaDaEmpresa(db, u.empresaId, id);
  if (!v) notFound();
  const aba = s.aba === 'arte' || s.aba === 'editar' || s.aba === 'impulsionar' ? s.aba : 'candidatos';
  const plano = await planoDe(db, u.id);
  const lim = limites(plano);
  const estado = rotuloEstado(v.estado, v.expiraEm);
  const link = `${URL_SITE}/vagas/${v.slug}`;
  const salario = formatarSalario(v.salarioCentavos);

  const conteudo = async () => {
    if (aba === 'arte') {
      const [e] = await db.select({ temLogo: empresas.logoMime }).from(empresas).where(eq(empresas.id, u.empresaId));
      return (
        <EditorArte
          vagaId={v.id}
          slug={v.slug}
          dados={{ titulo: v.titulo, empresa: v.empresaNome, cidade: `${v.cidade} - ${v.uf}`, contrato: v.contrato, modalidade: v.modalidade, salario, link }}
          inicial={{ ...v.arte, whatsapp: v.arte.whatsapp || u.telefone }}
          marca={lim.marcaNaArte}
          logoUrl={e?.temLogo ? `${BASE}/api/logo/${u.empresaId}` : null}
          imagemUrl={v.temImagem ? `${BASE}/api/vagas/${v.id}/imagem` : null}
          artePropriaUrl={v.temArtePropria ? `${BASE}/api/vagas/${v.id}/arte-propria` : null}
          beneficios={v.beneficios}
          vaga={{ cidade: v.cidade, uf: v.uf, requisitos: v.requisitos, area: v.area }}
        />
      );
    }
    if (aba === 'editar') return <FormEditarVaga v={v} />;
    if (aba === 'impulsionar') return <ImpulsoVaga vagaId={v.id} aberta={vagaAceitaCandidatura(v)} situacao={await situacaoDoImpulso(db, v.id)} pedidoNovo={s.pedido === '1'} />;
    const lista = await candidaturasDaVaga(db, u.empresaId, v.id, u.id);
    if (!lista.length) {
      return (
        <div className="vazio">
          <h2 style={{ fontSize: '1.6rem' }}>Nenhum candidato ainda</h2>
          <p className="leve">Poste a arte com o QR Code ou compartilhe o link para as pessoas chegarem até a vaga.</p>
          <Link className="btn" href={`/painel/vagas/${v.id}?aba=arte`}>Abrir a arte</Link>
        </div>
      );
    }
    return (
      <ul className="cartoes">
        {lista.map((c) => (
          <li key={c.id} className="cartao">
            <div>
              <h2 style={{ fontSize: '1.35rem' }}><Link href={`/conversas/${c.id}`} style={{ color: 'inherit' }}>{c.nome}</Link>{c.plus ? <span className="etiqueta etiqueta-neutra">Plus</span> : null}{c.naoLidas ? <span className="etiqueta etiqueta-erro">{c.naoLidas === 1 ? '1 não lida' : `${c.naoLidas} não lidas`}</span> : null}</h2>
              <small>{c.titulo ? `${c.titulo}. ` : ''}Candidatura em {formatarData(c.criadaEm)}.{c.temCurriculo ? ' Com currículo.' : ''} <Link href={`/candidatos/${c.candidatoId}`}>Ver perfil</Link></small>
            </div>
            <EnvioAuto action={acaoMudarEtapa}>
              <input type="hidden" name="candidaturaId" value={c.id} />
              <Selecao aria-label={`Etapa de ${c.nome}`} name="etapa" defaultValue={c.etapa}>{ETAPAS.map((e) => <option key={e.id} value={e.id}>{e.rotulo}</option>)}</Selecao>
            </EnvioAuto>
            <div className="linha-botoes">
              <Link className="btn btn-peq" href={`/conversas/${c.id}`}>Conversar</Link>
              <a className="btn btn-claro btn-peq" href={linkWhatsapp(c.telefone, `Olá, ${c.nome}! Vi sua candidatura para a vaga de ${v.titulo}.`)} target="_blank" rel="noopener">WhatsApp</a>
            </div>
          </li>
        ))}
      </ul>
    );
  };

  return (
    <>
      <Navegar voltarPara="/painel" rotulo="Suas vagas" />
      <div className="cabeca-linha">
        <div>
          <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3rem)' }}>{v.titulo}</h1>
          <p className="leve" style={{ marginTop: 6 }}>{estado}. Vale até {formatarData(v.expiraEm)}. <Link href={`/vagas/${v.slug}`}>Ver página pública</Link></p>
        </div>
        <div className="linha-botoes">
          {v.estado === 'aberta' && vagaAceitaCandidatura(v) ? (
            <>
              <form action={acaoDestaque}><input type="hidden" name="vagaId" value={v.id} /><button className="btn btn-claro btn-peq">{v.destaque ? 'Tirar destaque' : 'Destacar vaga'}</button></form>
              <form action={acaoEstadoVaga}><input type="hidden" name="vagaId" value={v.id} /><input type="hidden" name="estado" value="pausada" /><button className="btn btn-claro btn-peq">Pausar</button></form>
              <form action={acaoEstadoVaga}><input type="hidden" name="vagaId" value={v.id} /><input type="hidden" name="estado" value="encerrada" /><button className="btn btn-perigo btn-peq">Encerrar</button></form>
            </>
          ) : (
            <form action={acaoEstadoVaga}><input type="hidden" name="vagaId" value={v.id} /><input type="hidden" name="estado" value="aberta" /><button className="btn btn-peq">Reabrir por 30 dias</button></form>
          )}
        </div>
      </div>
      {s.erro ? <p className="aviso aviso-erro" role="alert" style={{ marginBottom: 16 }}>{s.erro.slice(0, 200)}</p> : null}
      {s.nova ? <p className="aviso aviso-ok" role="status" style={{ marginBottom: 16 }}>Vaga publicada. Baixe a arte e poste onde seus candidatos estão.</p> : null}
      <AbasLinks rotulo="Seções da vaga" itens={[
        { href: `/painel/vagas/${v.id}`, nome: 'Candidatos', ativo: aba === 'candidatos' },
        { href: `/painel/vagas/${v.id}?aba=arte`, nome: 'Arte', ativo: aba === 'arte' },
        { href: `/painel/vagas/${v.id}?aba=editar`, nome: 'Editar', ativo: aba === 'editar' },
        { href: `/painel/vagas/${v.id}?aba=impulsionar`, nome: 'Impulsionar', ativo: aba === 'impulsionar' },
      ]} />
      {await conteudo()}
    </>
  );
}
