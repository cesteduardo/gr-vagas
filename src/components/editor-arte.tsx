'use client';

import { Selecao } from '@/components/selecao';
import { useEffect, useRef, useState, type ChangeEvent, type CSSProperties, type ReactNode } from 'react';
import { acaoSalvarArte } from '@/app/acoes';
import { destaquesDe, destinoDaArte } from '@/lib/arte/dados';
import { coresDaImagem } from '@/lib/arte/desenhar';
import { CAMPOS_LEGENDA, ESTILOS_LEGENDA, juntarLegenda, legendaDaVaga, partesDaLegenda, type EstiloLegenda, type PartesLegenda } from '@/lib/arte/legenda';
import { CHAMADAS, FONTES, FORMATOS, MODELOS, PALETAS, type FormatoId, type ModeloId } from '@/lib/arte/modelos';
import type { ConfigArte } from '@/lib/db/schema';
import { formatarTelefone, normalizarTelefone, telefoneValido } from '@/lib/forms/validators';
import { ArteCanvas } from './arte-canvas';
import { CampoArquivo } from './campo-arquivo';
import { SeletorCor } from './seletor-cor';
import { Segmentado } from './segmentado';

const MODOS = [{ id: 'site' as const, nome: 'Arte do GR Vagas' }, { id: 'propria' as const, nome: 'Minha arte' }];

// A empresa que já tem a arte pronta sobe aqui; a do GR Vagas continua guardada para voltar quando quiser.
function ArtePropria({ url, slug, link, whatsapp, copiado, copiar, erro, enviar, tirar }: { url: string | null; slug: string; link: string; whatsapp: string; copiado: boolean; copiar: () => void; erro: string | null; enviar: (e: ChangeEvent<HTMLInputElement>) => void; tirar: () => void }) {
  return (
    <div className="editor-arte arte-propria">
      <div className="editor-previa">
        {url ? (
          <img className="arte-propria-img" src={url} alt="Sua arte da vaga" />
        ) : (
          <div className="arte-propria-vazia">
            <p><strong>Suba a arte que você já fez</strong></p>
            <p className="nota">PNG, JPG ou WebP, até 8 MB. Qualquer formato: post, story ou retrato.</p>
            <CampoArquivo id="arte-propria" accept="image/png,image/jpeg,image/webp" rotulo="Escolher a arte" onChange={enviar} />
          </div>
        )}
        {url ? (
          <div className="linha-botoes" style={{ justifyContent: 'center' }}>
            <a className="btn" href={`${url.split('?')[0]}?baixar=1`} download={`${slug}-arte`}>Baixar minha arte</a>
            <a className="btn btn-claro" href={`https://wa.me/?text=${encodeURIComponent(whatsapp)}`} target="_blank" rel="noopener">Enviar no WhatsApp</a>
          </div>
        ) : null}
        <div className="copia">
          <label className="so-leitor" htmlFor="link-vaga">Link da vaga</label>
          <input id="link-vaga" type="text" readOnly value={link} />
          <button type="button" className="btn btn-claro btn-peq" onClick={copiar}>{copiado ? 'Link copiado' : 'Copiar link'}</button>
        </div>
      </div>
      <div className="editor-comandos">
        {erro ? <p className="aviso aviso-erro" role="alert">{erro}</p> : null}
        <section className="passo">
          <h3><span>1</span>Sua arte pronta</h3>
          <p className="leve">Ela fica guardada junto com a vaga, para baixar e postar quando quiser.</p>
          {url ? (
            <div className="linha-botoes">
              <CampoArquivo id="arte-propria-trocar" accept="image/png,image/jpeg,image/webp" rotulo="Trocar a arte" onChange={enviar} />
              <button type="button" className="btn btn-claro btn-peq" onClick={tirar}>Tirar minha arte</button>
            </div>
          ) : null}
        </section>
        <section className="passo">
          <h3><span>2</span>Leve a pessoa até a vaga</h3>
          <p className="leve">Ponha na arte ou na legenda o link da vaga. Assim quem vê o post chega direto na candidatura, e as respostas caem na sua caixa de conversas.</p>
        </section>
      </div>
    </div>
  );
}

type Base = { titulo: string; empresa: string; cidade: string; contrato: string; modalidade: string; salario: string; link: string };
type Props = { vagaId: string; slug: string; dados: Base; inicial: ConfigArte; marca: boolean; logoUrl: string | null; imagemUrl: string | null; artePropriaUrl: string | null; beneficios: string; vaga: { cidade: string; uf: string; requisitos: string; area: string } };


function Grupo<T extends string>({ rotulo, opcoes, valor, muda }: { rotulo: string; opcoes: readonly { id: T; nome: string }[]; valor: T; muda: (v: T) => void }) {
  return (
    <div>
      <span className="rotulo-grupo">{rotulo}</span>
      <Segmentado rotulo={rotulo} opcoes={opcoes} valor={valor} muda={muda} />
    </div>
  );
}


// Fora do editor: se fosse criado lá dentro, o painel fecharia a cada mudança.
function Ajuste({ titulo, resumo, children }: { titulo: string; resumo: string; children: ReactNode }) {
  return (
    <details className="ajuste" data-ajuste={titulo}>
      <summary><span>{titulo}</span><small>{resumo}</small></summary>
      <div className="editor-painel">{children}</div>
    </details>
  );
}

export function EditorArte(p: Props) {
  const [c, setC] = useState<ConfigArte>(p.inicial);
  const [logoUrl, setLogoUrl] = useState(p.logoUrl);
  const [imagemUrl, setImagemUrl] = useState(p.imagemUrl);
  const [artePropria, setArtePropria] = useState(p.artePropriaUrl);
  const [modo, setModo] = useState<'site' | 'propria'>(p.artePropriaUrl ? 'propria' : 'site');
  const [coresLogo, setCoresLogo] = useState<string[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [copiado, setCopiado] = useState<string | null>(null);
  const [estilo, setEstilo] = useState<EstiloLegenda>('instagram');
  const canvas = useRef<HTMLCanvasElement | null>(null);
  const espera = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendente = useRef<ConfigArte | null>(null);

  const dadosLegenda = { titulo: p.dados.titulo, empresa: p.dados.empresa, cidade: p.vaga.cidade, uf: p.vaga.uf, contrato: p.dados.contrato, modalidade: p.dados.modalidade, salario: p.dados.salario, beneficios: p.beneficios, requisitos: p.vaga.requisitos, area: p.vaga.area, link: p.dados.link };
  const [partes, setPartes] = useState<PartesLegenda>(() => partesDaLegenda(dadosLegenda, 'instagram'));
  const legenda = juntarLegenda(partes, estilo);

  const gravar = () => {
    if (espera.current) clearTimeout(espera.current);
    if (pendente.current) void acaoSalvarArte(p.vagaId, pendente.current);
    pendente.current = null;
  };
  const muda = (m: Partial<ConfigArte>) => {
    const novo = { ...(pendente.current ?? c), ...m };
    setC(novo);
    pendente.current = novo;
    if (espera.current) clearTimeout(espera.current);
    espera.current = setTimeout(gravar, 250);
  };
  // Sair da tela logo depois de mexer não pode perder a escolha.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => gravar, []);

  useEffect(() => {
    if (!logoUrl) return setCoresLogo([]);
    const img = new Image();
    img.onload = () => setCoresLogo(coresDaImagem(img));
    img.src = logoUrl;
  }, [logoUrl]);

  const destaques = c.destaques ?? destaquesDe(p.beneficios);
  const zapValido = telefoneValido(c.whatsapp);
  const titulo = c.tituloArte || p.dados.titulo;
  const destino = destinoDaArte(p.dados.link, c.qr === 'whatsapp' && zapValido ? 'whatsapp' : 'vaga', c.whatsapp, titulo);
  const dadosArte = { titulo, empresa: p.dados.empresa, cidade: p.dados.cidade, contrato: p.dados.contrato, modalidade: p.dados.modalidade, salario: p.dados.salario, destaques: destaques.filter((t) => t.trim()), ...destino };
  const opcoesArte = { formato: c.formato as FormatoId, fundo: c.fundo, destaque: c.destaque, texto: c.texto, chamada: c.chamada, marca: p.marca, fonte: c.fonte, qrEstilo: c.qrEstilo, alinhamento: c.alinhamento, posicao: c.posicao, focoX: c.focoX, focoY: c.focoY };

  const baixar = () => {
    canvas.current?.toBlob((blob) => {
      if (!blob) return;
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `${p.slug}-${c.formato}.png`;
      a.click();
      URL.revokeObjectURL(a.href);
    }, 'image/png');
  };

  const copiar = async (conteudo: string, nome: string) => {
    try {
      await navigator.clipboard.writeText(conteudo);
      setCopiado(nome);
    } catch {
      setErro('O navegador não permitiu copiar. Selecione o texto e copie à mão.');
    }
  };

  const enviar = async (e: ChangeEvent<HTMLInputElement>, url: string, ok: (u: string) => void) => {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;
    setErro(null);
    const d = new FormData();
    d.set('arquivo', arquivo);
    try {
      const r = await fetch(url, { method: 'POST', body: d });
      const j = (await r.json()) as { url?: string; erro?: string };
      if (r.ok && j.url) ok(j.url);
      else setErro(j.erro ?? 'Não foi possível enviar o arquivo.');
    } catch {
      setErro('Não foi possível enviar o arquivo. Verifique a conexão e tente de novo.');
    }
    e.target.value = '';
  };

  const fonteAtual = FONTES.find((f) => f.id === c.fonte)?.nome ?? 'Inter';

  return (
    <div className="editor">
      <div className="editor-modo">
        <Segmentado rotulo="Qual arte usar" opcoes={MODOS} valor={modo} muda={setModo} />
      </div>
      {modo === 'propria' ? (
        <ArtePropria
          url={artePropria}
          slug={p.slug}
          link={p.dados.link}
          whatsapp={legendaDaVaga(dadosLegenda, 'whatsapp')}
          copiado={copiado === 'link'}
          copiar={() => copiar(p.dados.link, 'link')}
          erro={erro}
          enviar={(e) => enviar(e, `/api/vagas/${p.vagaId}/arte-propria`, setArtePropria)}
          tirar={async () => {
            setErro(null);
            const r = await fetch(`/api/vagas/${p.vagaId}/arte-propria`, { method: 'DELETE' }).catch(() => null);
            if (r?.ok) { setArtePropria(null); setModo('site'); } else setErro('Não foi possível tirar a arte. Tente de novo.');
          }}
        />
      ) : (
      <div className="editor-arte">
        <div className="editor-previa">
          <ArteCanvas rotulo={`Arte da vaga ${titulo}`} dados={dadosArte} opcoes={{ ...opcoesArte, modelo: c.modelo as ModeloId }} logoUrl={logoUrl} imagemUrl={imagemUrl} aoDesenhar={(el) => { canvas.current = el; }} />
          <Segmentado className="editor-formatos" rotulo="Formato da arte" opcoes={FORMATOS} valor={c.formato} muda={(v) => muda({ formato: v })} />
          <p className="nota" style={{ textAlign: 'center' }}>{FORMATOS.find((f) => f.id === c.formato)?.uso}</p>
          <div className="linha-botoes" style={{ justifyContent: 'center' }}>
            <button type="button" className="btn" onClick={baixar}>Baixar arte em PNG</button>
            <a className="btn btn-claro" href={`https://wa.me/?text=${encodeURIComponent(legendaDaVaga(dadosLegenda, 'whatsapp'))}`} target="_blank" rel="noopener">Enviar no WhatsApp</a>
          </div>
          <div className="copia">
            <label className="so-leitor" htmlFor="link-vaga">Link da vaga</label>
            <input id="link-vaga" type="text" readOnly value={p.dados.link} />
            <button type="button" className="btn btn-claro btn-peq" onClick={() => copiar(p.dados.link, 'link')}>{copiado === 'link' ? 'Link copiado' : 'Copiar link'}</button>
          </div>
        </div>

        <div className="editor-comandos">
          {erro ? <p className="aviso aviso-erro" role="alert">{erro}</p> : null}
          <section className="passo">
            <h3><span>1</span>Escolha um modelo</h3>
            <div className="miniaturas">
              {MODELOS.map((m) => (
                <button key={m.id} type="button" className="miniatura" aria-pressed={m.id === c.modelo} aria-label={m.nome} onClick={() => muda({ modelo: m.id })}>
                  <ArteCanvas rotulo="" dados={dadosArte} opcoes={{ ...opcoesArte, modelo: m.id, formato: 'feed' }} logoUrl={logoUrl} imagemUrl={imagemUrl} />
                  <span>{m.nome}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="passo">
            <h3><span>2</span>Escolha as cores</h3>
            <div className="paletas" role="group" aria-label="Paletas prontas">
              {PALETAS.map((t) => (
                <button key={t.nome} type="button" className="paleta" aria-pressed={c.fundo === t.fundo && c.destaque === t.destaque} onClick={() => muda({ fundo: t.fundo, destaque: t.destaque, texto: t.texto })}>
                  <span aria-hidden="true"><i style={{ background: t.fundo }} /><i style={{ background: t.destaque }} /><i style={{ background: t.texto }} /></span>
                  {t.nome}
                </button>
              ))}
            </div>
          </section>

          <section className="passo">
            <h3><span>3</span>Baixe e poste</h3>
            <p className="leve">A arte já está pronta. Se quiser, mude os detalhes abaixo.</p>
            <Ajuste titulo="Cores próprias" resumo="Fundo, destaque e texto">
              <div className="cores-escolha">
                <SeletorCor rotulo="Fundo" valor={c.fundo} muda={(v) => muda({ fundo: v })} />
                <SeletorCor rotulo="Destaque" valor={c.destaque} muda={(v) => muda({ destaque: v })} />
                <SeletorCor rotulo="Texto" valor={c.texto} muda={(v) => muda({ texto: v })} />
              </div>
              {coresLogo.length ? (
                <div className="cores" role="group" aria-label="Cores do seu logo">
                  <span className="nota">Do seu logo:</span>
                  {coresLogo.map((cor) => <button key={cor} type="button" className="cor" style={{ background: cor }} aria-label={`Usar ${cor} como destaque`} onClick={() => muda({ destaque: cor })} />)}
                </div>
              ) : null}
              <p className="nota">Se o texto ficar difícil de ler, a arte ajusta sozinha.</p>
            </Ajuste>
            <Ajuste titulo="Texto e fonte" resumo={`${fonteAtual}, "${c.chamada}"`}>
              <label className="campo">
                <span>Cargo na arte</span>
                <input type="text" maxLength={80} value={c.tituloArte ?? p.dados.titulo} onChange={(e) => muda({ tituloArte: e.target.value })} />
              </label>
              <label className="campo">
                <span>Frase de chamada</span>
                <Selecao value={c.chamada} onChange={(e) => muda({ chamada: e.target.value })}>{CHAMADAS.map((t) => <option key={t}>{t}</option>)}</Selecao>
              </label>
              <div>
                <span className="rotulo-grupo">O que destacar</span>
                <div className="destaques">
                  {[0, 1, 2].map((i) => (
                    <input key={i} type="text" maxLength={34} aria-label={`Destaque ${i + 1}`} placeholder={['Vale-transporte', 'Vale-refeição', 'Plano de saúde'][i]} value={destaques[i] ?? ''} onChange={(e) => { const novo = [0, 1, 2].map((x) => (x === i ? e.target.value : destaques[x] ?? '')); muda({ destaques: novo }); }} />
                  ))}
                </div>
                <p className="nota" style={{ marginTop: 6 }}>Vêm dos benefícios da vaga. Se faltar espaço, a arte mostra menos itens.</p>
              </div>
              <div>
                <span className="rotulo-grupo" id="r-fonte">Fonte</span>
                <div className="fontes" role="group" aria-labelledby="r-fonte">
                  {FONTES.map((f) => <button key={f.id} type="button" aria-pressed={f.id === c.fonte} style={{ fontFamily: `${f.familia}, ${f.reserva}` }} onClick={() => muda({ fonte: f.id })}>{f.nome}</button>)}
                </div>
              </div>
            </Ajuste>

            <Ajuste titulo="Foto e logo" resumo={imagemUrl ? 'Com foto' : logoUrl ? 'Com logo' : 'Sem foto nem logo'}>
              <div>
                <span className="rotulo-grupo">Foto da vaga ou da empresa</span>
                <CampoArquivo id="imagem" accept="image/png,image/jpeg,image/webp" rotulo="Escolher foto" onChange={(e) => enviar(e, `/api/vagas/${p.vagaId}/imagem`, (u) => { setImagemUrl(u); if (c.modelo !== 'foto' && c.modelo !== 'fotointeira') muda({ modelo: 'foto' }); })} />
                <p className="nota">Até 4 MB. Use só imagens suas. Aparece nos modelos Com foto e Foto inteira.</p>
              </div>
              {imagemUrl ? (
                <>
                  <div className="duas-col">
                    <label className="campo"><span>Enquadrar na horizontal</span><input type="range" min={0} max={100} style={{ '--p': `${c.focoX ?? 50}%` } as CSSProperties} value={c.focoX ?? 50} onChange={(e) => muda({ focoX: Number(e.target.value) })} /></label>
                    <label className="campo"><span>Enquadrar na vertical</span><input type="range" min={0} max={100} style={{ '--p': `${c.focoY ?? 50}%` } as CSSProperties} value={c.focoY ?? 50} onChange={(e) => muda({ focoY: Number(e.target.value) })} /></label>
                  </div>
                  <div><button type="button" className="btn btn-claro btn-peq" onClick={async () => { await fetch(`/api/vagas/${p.vagaId}/imagem`, { method: 'DELETE' }); setImagemUrl(null); }}>Remover foto</button></div>
                </>
              ) : null}
              <div>
                <span className="rotulo-grupo">Logo da empresa</span>
                <CampoArquivo id="logo" accept="image/png,image/jpeg,image/webp" rotulo="Escolher logo" onChange={(e) => enviar(e, '/api/logo', setLogoUrl)} />
                <p className="nota">PNG, JPG ou WebP, até 1 MB. Vale para todas as suas vagas.</p>
              </div>
            </Ajuste>

            <Ajuste titulo="QR Code" resumo={c.qr === 'whatsapp' ? 'Leva ao seu WhatsApp' : 'Leva à página da vaga'}>
              <fieldset className="grupo-radio">
                <legend>Para onde o QR Code leva</legend>
                <label className="opcao"><input type="radio" name="qr" checked={c.qr !== 'whatsapp'} onChange={() => muda({ qr: 'vaga' })} />Página da vaga</label>
                <label className="opcao"><input type="radio" name="qr" checked={c.qr === 'whatsapp'} onChange={() => muda({ qr: 'whatsapp' })} />Meu WhatsApp</label>
              </fieldset>
              {c.qr === 'whatsapp' ? (
                <label className="campo">
                  <span>WhatsApp que recebe os candidatos</span>
                  <input type="tel" inputMode="numeric" name="zap" value={formatarTelefone(c.whatsapp)} onChange={(e) => muda({ whatsapp: normalizarTelefone(e.target.value) })} aria-invalid={zapValido ? undefined : true} />
                  {zapValido ? null : <span className="erro">Informe o WhatsApp com DDD.</span>}
                </label>
              ) : null}
              <Grupo rotulo="Desenho do QR Code" opcoes={[{ id: 'suave', nome: 'Arredondado' }, { id: 'pontos', nome: 'Pontos' }] as const} valor={c.qrEstilo} muda={(v) => muda({ qrEstilo: v })} />
              <p className="nota">Teste com a câmera do celular antes de imprimir.</p>
            </Ajuste>
          </section>
        </div>
      </div>
      )}

      <section className="painel-caixa legenda-bloco" aria-labelledby="t-legenda">
        <div className="cabeca-linha" style={{ marginBottom: 0 }}>
          <h3 id="t-legenda" style={{ fontSize: 22 }}>Legenda para o post</h3>
          <Segmentado rotulo="Estilo da legenda" opcoes={ESTILOS_LEGENDA} valor={estilo} muda={(v) => { setEstilo(v); setPartes(partesDaLegenda(dadosLegenda, v)); }} />
        </div>
        <div className="legenda-campos">
          {CAMPOS_LEGENDA.filter((c) => estilo !== 'curta' || ['abertura', 'detalhes', 'candidatura'].includes(c.id)).map((c) => (
            <label key={c.id} className="campo">
              <span>{c.nome}</span>
              <textarea data-parte={c.id} rows={Math.max(2, partes[c.id].split('\n').length)} value={partes[c.id]} placeholder="Deixe vazio para não usar" onChange={(e) => setPartes((a) => ({ ...a, [c.id]: e.target.value }))} />
            </label>
          ))}
          <div className="legenda-previa">
            <span className="rotulo-grupo">Como vai ficar</span>
            <pre id="legenda">{legenda}</pre>
          </div>
        </div>
        <div className="linha-botoes">
          <button type="button" className="btn" onClick={() => copiar(legenda, 'legenda')}>{copiado === 'legenda' ? 'Legenda copiada' : 'Copiar legenda'}</button>
          <a className="btn btn-claro" href={`https://wa.me/?text=${encodeURIComponent(legenda)}`} target="_blank" rel="noopener">Abrir no WhatsApp</a>
        </div>
      </section>
    </div>
  );
}
