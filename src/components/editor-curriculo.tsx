'use client';

import { useState, type ReactNode } from 'react';
import { acaoSalvarCurriculo } from '@/app/acoes';
import { CIDADES } from '@/lib/config';
import { ESTADOS_CIVIS, NIVEIS, type Cv, type Experiencia, type Formacao } from '@/lib/curriculo';
import { CampoArquivo } from './campo-arquivo';
import { Selecao } from './selecao';

type Inicial = { titulo: string; cidadeSlug: string; resumo: string; talentos: boolean; cv: Cv; curriculoNome: string | null; candidatoId: string };

const mascaraData = (v: string) => {
  const d = v.replace(/\D/g, '').slice(0, 8);
  return [d.slice(0, 2), d.slice(2, 4), d.slice(4)].filter(Boolean).join('/');
};
const brParaIso = (br: string) => (/^\d{2}\/\d{2}\/\d{4}$/.test(br) ? br.split('/').reverse().join('-') : '');
const isoParaBr = (iso?: string) => (iso ? iso.split('-').reverse().join('/') : '');
const ano = (v: string) => v.replace(/\D/g, '').slice(0, 4);

function Bloco({ numero, titulo, children, acao }: { numero: number; titulo: string; children: ReactNode; acao?: ReactNode }) {
  return (
    <section className="cv-bloco">
      <div className="cv-bloco-topo"><h2><span>{numero}</span>{titulo}</h2>{acao}</div>
      {children}
    </section>
  );
}

// Perfil com a mesma estrutura do currículo: quem já tem um, preenche igual.
export function EditorCurriculo({ inicial }: { inicial: Inicial }) {
  const [titulo, setTitulo] = useState(inicial.titulo);
  const [cidade, setCidade] = useState(inicial.cidadeSlug);
  const [resumo, setResumo] = useState(inicial.resumo);
  const [talentos, setTalentos] = useState(inicial.talentos);
  const [cv, setCv] = useState<Cv>({ idiomas: [], formacao: [], experiencias: [], habilidades: [], ...inicial.cv });
  const [nascimento, setNascimento] = useState(isoParaBr(inicial.cv.nascimento));
  const [habilidade, setHabilidade] = useState('');
  const [arquivo, setArquivo] = useState(inicial.curriculoNome);
  const [lido, setLido] = useState<Cv | null>(null);
  const [estado, setEstado] = useState<{ ok?: string; erro?: string; erros?: Record<string, string> }>({});
  const [salvando, setSalvando] = useState(false);

  const muda = (m: Partial<Cv>) => setCv((a) => ({ ...a, ...m }));
  const mudaItem = <K extends 'formacao' | 'experiencias'>(k: K, i: number, m: Partial<NonNullable<Cv[K]>[number]>) =>
    setCv((a) => ({ ...a, [k]: (a[k] ?? []).map((x, j) => (j === i ? { ...x, ...m } : x)) }));
  const tirar = (k: 'formacao' | 'experiencias' | 'idiomas', i: number) => setCv((a) => ({ ...a, [k]: (a[k] ?? []).filter((_, j) => j !== i) }));

  const salvar = async () => {
    setSalvando(true);
    setEstado({});
    const r = await acaoSalvarCurriculo({ titulo, cidadeSlug: cidade, resumo, talentos, cv: { ...cv, nascimento: brParaIso(nascimento) } });
    setEstado(r.erros ? { erros: r.erros } : r.erro ? { erro: r.erro } : { ok: 'Perfil salvo.' });
    setSalvando(false);
    if (r.erros) requestAnimationFrame(() => document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());
  };

  const usarLido = () => {
    if (!lido) return;
    setCv((a) => ({ ...a, ...Object.fromEntries(Object.entries(lido).filter(([, v]) => (Array.isArray(v) ? v.length : v))) }));
    if (lido.nascimento) setNascimento(isoParaBr(lido.nascimento));
    setLido(null);
  };

  const erro = (k: string) => estado.erros?.[k];
  return (
    <form className="pilha" onSubmit={(e) => { e.preventDefault(); void salvar(); }} noValidate>
      <div className="painel-caixa cv-importar">
        <div>
          <h2 style={{ fontSize: 20 }}>Seu currículo em PDF</h2>
          <p className="nota">{arquivo ? `Arquivo atual: ${arquivo}. ` : ''}A empresa recebe junto com a candidatura. Ao enviar, a gente lê e pode preencher o perfil abaixo.</p>
          {arquivo ? <p style={{ marginTop: 6 }}><a href={`/api/curriculo/${inicial.candidatoId}`}>{arquivo}</a></p> : null}
        </div>
        <CampoArquivo id="arquivo-curriculo" accept="application/pdf" rotulo="Enviar PDF" onChange={async (e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          const d = new FormData();
          d.set('arquivo', f);
          try {
            const r = await fetch('/api/curriculo', { method: 'POST', body: d });
            const j = (await r.json()) as { nome?: string; erro?: string; cv?: Cv };
            if (!r.ok || !j.nome) setEstado({ erro: j.erro ?? 'Não foi possível enviar o arquivo.' });
            else {
              setArquivo(j.nome);
              const temAlgo = j.cv && (j.cv.formacao?.length || j.cv.experiencias?.length || j.cv.idiomas?.length);
              setLido(temAlgo ? j.cv! : null);
            }
          } catch {
            setEstado({ erro: 'Não foi possível enviar o arquivo. Verifique a conexão e tente de novo.' });
          }
          e.target.value = '';
        }} />
        {lido ? (
          <p className="aviso aviso-ok">
            Encontramos {lido.experiencias?.length ?? 0} experiências, {lido.formacao?.length ?? 0} formações e {lido.idiomas?.length ?? 0} idiomas no arquivo.
            <button type="button" className="btn btn-peq" style={{ marginLeft: 10 }} onClick={usarLido}>Preencher meu perfil</button>
          </p>
        ) : null}
      </div>

      <Bloco numero={1} titulo="Sobre você">
        <div className="cv-grade">
          <label className="campo inteiro"><span>O que você faz</span><input type="text" name="titulo" maxLength={80} placeholder="Ex.: Recepcionista, Designer, Motorista" value={titulo} onChange={(e) => setTitulo(e.target.value)} aria-invalid={erro('titulo') ? true : undefined} />{erro('titulo') ? <span className="erro">{erro('titulo')}</span> : null}</label>
          <label className="campo"><span>Cidade</span><Selecao name="cidade" value={cidade} onChange={(e) => setCidade(e.target.value)} aria-invalid={erro('cidade') ? true : undefined}><option value="">Escolha</option>{CIDADES.map((c) => <option key={c.slug} value={c.slug}>{c.nome}</option>)}</Selecao>{erro('cidade') ? <span className="erro">{erro('cidade')}</span> : null}</label>
          <label className="campo"><span>Objetivo</span><input type="text" maxLength={160} placeholder="Ex.: Atuar com atendimento ao público" value={cv.objetivo ?? ''} onChange={(e) => muda({ objetivo: e.target.value })} /></label>
          <label className="campo inteiro"><span>Resumo profissional</span><textarea name="resumo" maxLength={2000} placeholder="Conte em poucas linhas sua experiência e o que você sabe fazer." value={resumo} onChange={(e) => setResumo(e.target.value)} aria-invalid={erro('resumo') ? true : undefined} />{erro('resumo') ? <span className="erro">{erro('resumo')}</span> : null}</label>
        </div>
      </Bloco>

      <Bloco numero={2} titulo="Dados pessoais">
        <p className="nota">Opcionais. Nenhuma empresa pode recusar você por estado civil ou idade.</p>
        <div className="cv-grade">
          <label className="campo"><span>Estado civil</span><Selecao value={cv.estadoCivil ?? ''} onChange={(e) => muda({ estadoCivil: e.target.value })}>{ESTADOS_CIVIS.map((x) => <option key={x} value={x}>{x || 'Prefiro não dizer'}</option>)}</Selecao></label>
          <label className="campo"><span>Nascimento</span><input type="text" inputMode="numeric" placeholder="dd/mm/aaaa" value={nascimento} onChange={(e) => setNascimento(mascaraData(e.target.value))} /></label>
          <label className="campo inteiro"><span>Endereço</span><input type="text" maxLength={160} placeholder="Rua, número e bairro" value={cv.endereco ?? ''} onChange={(e) => muda({ endereco: e.target.value })} /></label>
          <label className="campo inteiro"><span>Portfólio, site ou LinkedIn</span><input type="text" maxLength={160} placeholder="seusite.com.br" value={cv.portfolio ?? ''} onChange={(e) => muda({ portfolio: e.target.value })} /></label>
        </div>
      </Bloco>

      <Bloco numero={3} titulo="Idiomas" acao={<button type="button" className="btn btn-claro btn-peq" onClick={() => muda({ idiomas: [...(cv.idiomas ?? []), { lingua: '', nivel: 'Básico' }] })}>Adicionar idioma</button>}>
        {cv.idiomas?.length ? cv.idiomas.map((it, i) => (
          <div key={i} className="cv-linha">
            <label className="campo"><span>Idioma</span><input type="text" maxLength={40} placeholder="Inglês" value={it.lingua} onChange={(e) => muda({ idiomas: cv.idiomas!.map((x, j) => (j === i ? { ...x, lingua: e.target.value } : x)) })} /></label>
            <label className="campo"><span>Nível</span><Selecao value={it.nivel} onChange={(e) => muda({ idiomas: cv.idiomas!.map((x, j) => (j === i ? { ...x, nivel: e.target.value } : x)) })}>{NIVEIS.map((n) => <option key={n}>{n}</option>)}</Selecao></label>
            <button type="button" className="btn btn-claro btn-peq cv-tirar" onClick={() => tirar('idiomas', i)}>Remover</button>
          </div>
        )) : <p className="nota">Nenhum idioma ainda.</p>}
      </Bloco>

      <Bloco numero={4} titulo="Formação acadêmica" acao={<button type="button" className="btn btn-claro btn-peq" onClick={() => muda({ formacao: [...(cv.formacao ?? []), { inicio: '', fim: '', curso: '', instituicao: '', descricao: '' }] })}>Adicionar formação</button>}>
        {cv.formacao?.length ? cv.formacao.map((f: Formacao, i) => (
          <div key={i} className="cv-cartao">
            <div className="cv-grade">
              <label className="campo inteiro"><span>Curso</span><input type="text" maxLength={120} placeholder="Técnico em informática" value={f.curso} onChange={(e) => mudaItem('formacao', i, { curso: e.target.value })} /></label>
              <label className="campo inteiro"><span>Instituição</span><input type="text" maxLength={120} placeholder="SENAC" value={f.instituicao} onChange={(e) => mudaItem('formacao', i, { instituicao: e.target.value })} /></label>
              <label className="campo"><span>Ano de início</span><input type="text" inputMode="numeric" placeholder="2018" value={f.inicio} onChange={(e) => mudaItem('formacao', i, { inicio: ano(e.target.value) })} /></label>
              <label className="campo"><span>Ano de conclusão</span><input type="text" inputMode="numeric" placeholder="2019" value={f.fim} onChange={(e) => mudaItem('formacao', i, { fim: ano(e.target.value) })} /></label>
              <label className="campo inteiro"><span>O que aprendeu</span><textarea maxLength={600} value={f.descricao} onChange={(e) => mudaItem('formacao', i, { descricao: e.target.value })} /></label>
            </div>
            <button type="button" className="btn btn-claro btn-peq cv-tirar" onClick={() => tirar('formacao', i)}>Remover</button>
          </div>
        )) : <p className="nota">Nenhuma formação ainda.</p>}
      </Bloco>

      <Bloco numero={5} titulo="Experiência profissional" acao={<button type="button" className="btn btn-claro btn-peq" onClick={() => muda({ experiencias: [{ inicio: '', fim: '', atual: false, cargo: '', empresa: '', descricao: '' }, ...(cv.experiencias ?? [])] })}>Adicionar experiência</button>}>
        {cv.experiencias?.length ? cv.experiencias.map((x: Experiencia, i) => (
          <div key={i} className="cv-cartao">
            <div className="cv-grade">
              <label className="campo"><span>Cargo</span><input type="text" maxLength={120} placeholder="Atendente" value={x.cargo} onChange={(e) => mudaItem('experiencias', i, { cargo: e.target.value })} /></label>
              <label className="campo"><span>Empresa</span><input type="text" maxLength={120} placeholder="Loja Exemplo" value={x.empresa} onChange={(e) => mudaItem('experiencias', i, { empresa: e.target.value })} /></label>
              <label className="campo"><span>Ano de início</span><input type="text" inputMode="numeric" placeholder="2023" value={x.inicio} onChange={(e) => mudaItem('experiencias', i, { inicio: ano(e.target.value) })} /></label>
              {x.atual ? <div className="campo"><span>Ano de saída</span><p className="cv-atual">Trabalho lá atualmente</p></div> : <label className="campo"><span>Ano de saída</span><input type="text" inputMode="numeric" placeholder="2025" value={x.fim} onChange={(e) => mudaItem('experiencias', i, { fim: ano(e.target.value) })} /></label>}
              <label className="aceite inteiro"><input type="checkbox" checked={x.atual} onChange={(e) => mudaItem('experiencias', i, { atual: e.target.checked })} /><span>Trabalho aqui atualmente</span></label>
              <label className="campo inteiro"><span>O que você fazia</span><textarea maxLength={1200} value={x.descricao} onChange={(e) => mudaItem('experiencias', i, { descricao: e.target.value })} /></label>
            </div>
            <button type="button" className="btn btn-claro btn-peq cv-tirar" onClick={() => tirar('experiencias', i)}>Remover</button>
          </div>
        )) : <p className="nota">Nenhuma experiência ainda. Primeiro emprego? Tudo bem: conte cursos e o que você sabe fazer.</p>}
      </Bloco>

      <Bloco numero={6} titulo="Habilidades">
        <div className="cv-habilidades">
          {(cv.habilidades ?? []).map((h) => <button key={h} type="button" className="etiqueta etiqueta-neutra" onClick={() => muda({ habilidades: cv.habilidades!.filter((x) => x !== h) })} aria-label={`Tirar ${h}`}>{h} ×</button>)}
          <input type="text" maxLength={40} placeholder="Digite e aperte Enter" value={habilidade} onChange={(e) => setHabilidade(e.target.value)} onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ',') {
              e.preventDefault();
              const h = habilidade.trim();
              if (h && !(cv.habilidades ?? []).includes(h)) muda({ habilidades: [...(cv.habilidades ?? []), h].slice(0, 20) });
              setHabilidade('');
            }
          }} />
        </div>
      </Bloco>

      <div className="painel-caixa pilha">
        <label className="aceite"><input type="checkbox" name="talentos" checked={talentos} onChange={(e) => setTalentos(e.target.checked)} /><span>Aceito aparecer no banco de talentos: empresas assinantes podem ver meu nome, contato, perfil e currículo e me chamar para vagas. Posso retirar este aceite quando quiser.</span></label>
        {estado.ok ? <p className="aviso aviso-ok" role="status">{estado.ok}</p> : null}
        {estado.erro ? <p className="aviso aviso-erro" role="alert">{estado.erro}</p> : null}
        <div><button className="btn" disabled={salvando}>{salvando ? 'Salvando…' : 'Salvar perfil'}</button></div>
      </div>
    </form>
  );
}
