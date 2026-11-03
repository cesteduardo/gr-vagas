import { Selecao } from '@/components/selecao';
import type { Metadata } from 'next';
import Link from 'next/link';
import { exigirContratante } from '@/lib/auth/sessao';
import { CIDADES, cidadePorSlug } from '@/lib/config';
import { banco } from '@/lib/db/client';
import { buscarTalentos } from '@/lib/perfis';
import { limites, planoDe } from '@/lib/planos';
import { linkWhatsapp } from '@/lib/texto';

export const metadata: Metadata = { title: 'Banco de talentos' };

export default async function Talentos({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const u = await exigirContratante();
  const s = await searchParams;
  const db = await banco();
  const liberado = limites(await planoDe(db, u.id)).talentos;
  if (!liberado) {
    return (
      <div className="vazio">
        <h1 style={{ fontSize: '2rem', marginBottom: 8 }}>Banco de talentos</h1>
        <p className="leve">Encontre candidatos que aceitaram aparecer aqui, antes mesmo de publicar a vaga. Faz parte do plano Profissional.</p>
        <Link className="btn" href="/painel/plano">Ver planos</Link>
      </div>
    );
  }
  const lista = await buscarTalentos(db, { q: s.q?.slice(0, 80), cidade: s.cidade });
  return (
    <>
      <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3rem)', marginBottom: 20 }}>Banco de talentos</h1>
      <form className="painel-caixa busca" action="/painel/talentos" style={{ marginBottom: 20 }}>
        <label className="campo"><span>Cargo ou palavra-chave</span><input type="search" name="q" defaultValue={s.q} /></label>
        <label className="campo"><span>Cidade</span><Selecao name="cidade" defaultValue={s.cidade ?? ''}><option value="">Todas</option>{CIDADES.map((c) => <option key={c.slug} value={c.slug}>{c.nome}</option>)}</Selecao></label>
        <button className="btn">Buscar</button>
      </form>
      {lista.length ? (
        <ul className="cartoes">
          {lista.map((t) => (
            <li key={t.id} className="cartao">
              <div>
                <h2 style={{ fontSize: '1.35rem' }}>{t.nome}{t.plus ? <span className="etiqueta">Plus</span> : null}</h2>
                <small>{t.titulo}{cidadePorSlug(t.cidadeSlug) ? `, ${cidadePorSlug(t.cidadeSlug)!.nome}` : ''}</small>
                <p style={{ marginTop: 6, whiteSpace: 'pre-line' }}>{t.resumo}</p>
              </div>
              <div className="linha-botoes">
                {t.temCurriculo ? <a className="btn btn-claro btn-peq" href={`/api/curriculo/${t.id}`}>Currículo</a> : null}
                <a className="btn btn-peq" href={linkWhatsapp(t.telefone, `Olá, ${t.nome}! Vi seu perfil no GR Vagas e tenho uma vaga para conversar.`)} target="_blank" rel="noopener">WhatsApp</a>
              </div>
            </li>
          ))}
        </ul>
      ) : <p className="vazio">Nenhum perfil com esses filtros.</p>}
    </>
  );
}
