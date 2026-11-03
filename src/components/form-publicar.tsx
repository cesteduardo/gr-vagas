'use client';

import { Selecao } from '@/components/selecao';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { acaoPublicar } from '@/app/acoes';
import { destaquesDe, destinoDaArte } from '@/lib/arte/dados';
import { ARTE_PADRAO } from '@/lib/arte/modelos';
import { AREAS, CIDADE_PRINCIPAL, CIDADES, cidadePorSlug, CONTRATOS, MODALIDADES } from '@/lib/config';
import { errosVaga } from '@/lib/forms/vaga';
import { formatarSalario, lerSalario } from '@/lib/texto';
import { ArteCanvas } from './arte-canvas';
import { aria, AvisoLink, Campo, pega, useFormulario } from './formulario-base';

const RASCUNHO = 'grvagas-rascunho';
type Valores = { titulo: string; empresa: string; area: string; contrato: string; modalidade: string; cidade: string; salarioTipo: string; salario: string; descricao: string; requisitos: string; beneficios: string };

function lerRascunho(): Partial<Valores> {
  try {
    return JSON.parse(localStorage.getItem(RASCUNHO) ?? '{}') as Partial<Valores>;
  } catch {
    return {};
  }
}
function gravarRascunho(v: Valores | null) {
  try {
    if (v) localStorage.setItem(RASCUNHO, JSON.stringify(v));
    else localStorage.removeItem(RASCUNHO);
  } catch {
    // Sem armazenamento, o formulário segue funcionando; só não guarda o rascunho.
  }
}

export function FormPublicar({ logado, empresaNome, inicial, link, demo }: { logado: boolean; empresaNome?: string; inicial: { titulo?: string; empresa?: string }; link: string; demo?: boolean }) {
  const [v, setV] = useState<Valores>({ titulo: inicial.titulo ?? '', empresa: inicial.empresa ?? empresaNome ?? '', area: '', contrato: 'CLT', modalidade: 'Presencial', cidade: CIDADE_PRINCIPAL.slug, salarioTipo: 'combinar', salario: '', descricao: '', requisitos: '', beneficios: '' });
  useEffect(() => {
    const r = lerRascunho();
    setV((a) => ({ ...a, ...r, titulo: inicial.titulo || r.titulo || a.titulo, empresa: empresaNome ?? (inicial.empresa || r.empresa || a.empresa) }));
    // Só na abertura da página.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    gravarRascunho(v);
  }, [v]);
  const [colado, setColado] = useState('');
  const [lendo, setLendo] = useState(false);
  const [erroColar, setErroColar] = useState<string | null>(null);
  const organizar = async () => {
    setErroColar(null);
    setLendo(true);
    try {
      const r = await fetch('/api/ia/vaga', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ texto: colado }) });
      const j = (await r.json()) as { vaga?: Partial<Valores> & { salario?: string }; erro?: string };
      if (!r.ok || !j.vaga) setErroColar(j.erro ?? 'Não foi possível ler o texto.');
      else {
        const lida = Object.fromEntries(Object.entries(j.vaga).filter(([, x]) => x));
        setV((a) => ({ ...a, ...lida, salarioTipo: j.vaga?.salario ? 'valor' : a.salarioTipo }));
        setColado('');
      }
    } catch {
      setErroColar('Não foi possível ler o texto. Verifique a conexão e tente de novo.');
    }
    setLendo(false);
  };
  const muda = (campo: keyof Valores) => (e: { target: { value: string } }) => setV((a) => ({ ...a, [campo]: e.target.value }));

  const fm = useFormulario(acaoPublicar, (f) => ({
    ...errosVaga({ titulo: pega(f, 'titulo'), area: pega(f, 'area'), contrato: pega(f, 'contrato'), modalidade: pega(f, 'modalidade'), cidade: pega(f, 'cidade'), salarioTipo: pega(f, 'salarioTipo'), salario: pega(f, 'salario'), descricao: pega(f, 'descricao'), requisitos: pega(f, 'requisitos'), beneficios: pega(f, 'beneficios') }),
  }));

  const c = cidadePorSlug(v.cidade) ?? CIDADE_PRINCIPAL;
  const salario = v.salarioTipo === 'valor' ? formatarSalario(lerSalario(v.salario)) : 'A combinar';
  return (
    <div className="publicar-grade">
      <div className="pilha">
      {demo ? (
        <div><button type="button" className="btn btn-claro btn-peq" onClick={() => setV((a) => ({ ...a, titulo: 'Auxiliar de cozinha', area: 'Restaurantes e alimentação', contrato: 'CLT', modalidade: 'Presencial', cidade: 'sao-jose-do-rio-preto', salarioTipo: 'valor', salario: '1.900,00', descricao: 'Preparar os alimentos, organizar a cozinha e manter tudo limpo durante o turno.', requisitos: 'Experiência em cozinha\nDisponibilidade aos fins de semana', beneficios: 'Vale-transporte\nRefeição no local\nFolga aos domingos', empresa: a.empresa || 'Restaurante Exemplo' }))}>Preencher com exemplo (demonstração)</button></div>
      ) : null}
      <div className="painel-caixa pilha" style={{ gap: 12 }}>
        <label className="campo">
          <span>Já tem o texto da vaga? Cole aqui e a gente organiza</span>
          <textarea value={colado} maxLength={8000} placeholder="Pode ser a mensagem que você manda nos grupos" onChange={(e) => setColado(e.target.value)} />
        </label>
        {erroColar ? <p className="erro" role="alert">{erroColar}</p> : null}
        <div><button type="button" className="btn btn-claro btn-peq" disabled={lendo || colado.trim().length < 10} onClick={organizar}>{lendo ? 'Organizando…' : 'Preencher com este texto'}</button></div>
      </div>
      <form ref={fm.ref} action={fm.despachar} onSubmit={fm.aoEnviar} noValidate className="pilha">
        {fm.estado.erro ? <p className="aviso aviso-erro" role="alert">{fm.estado.erro}</p> : null}
        <AvisoLink estado={fm.estado} />
        <Campo rotulo="Cargo" erro={fm.erros.titulo} nome="titulo">
          <input type="text" name="titulo" maxLength={80} value={v.titulo} onChange={muda('titulo')} {...aria('titulo', fm.erros.titulo)} />
        </Campo>
        <div className="duas-col">
          <Campo rotulo="Área" erro={fm.erros.area} nome="area">
            <Selecao name="area" value={v.area} onChange={muda('area')} {...aria('area', fm.erros.area)}>
              <option value="">Escolha</option>
              {AREAS.map((a) => <option key={a}>{a}</option>)}
            </Selecao>
          </Campo>
          <Campo rotulo="Cidade" erro={fm.erros.cidade} nome="cidade">
            <Selecao name="cidade" value={v.cidade} onChange={muda('cidade')} {...aria('cidade', fm.erros.cidade)}>
              {CIDADES.map((x) => <option key={x.slug} value={x.slug}>{x.nome}</option>)}
            </Selecao>
          </Campo>
          <Campo rotulo="Contrato" erro={fm.erros.contrato} nome="contrato">
            <Selecao name="contrato" value={v.contrato} onChange={muda('contrato')} {...aria('contrato', fm.erros.contrato)}>
              {CONTRATOS.map((x) => <option key={x}>{x}</option>)}
            </Selecao>
          </Campo>
          <Campo rotulo="Modalidade" erro={fm.erros.modalidade} nome="modalidade">
            <Selecao name="modalidade" value={v.modalidade} onChange={muda('modalidade')} {...aria('modalidade', fm.erros.modalidade)}>
              {MODALIDADES.map((x) => <option key={x}>{x}</option>)}
            </Selecao>
          </Campo>
        </div>
        <fieldset className="grupo-radio">
          <legend>Salário</legend>
          <label className="opcao"><input type="radio" name="salarioTipo" value="combinar" checked={v.salarioTipo === 'combinar'} onChange={muda('salarioTipo')} />A combinar</label>
          <label className="opcao"><input type="radio" name="salarioTipo" value="valor" checked={v.salarioTipo === 'valor'} onChange={muda('salarioTipo')} />Informar valor</label>
        </fieldset>
        {v.salarioTipo === 'valor' ? (
          <Campo rotulo="Valor mensal em reais" erro={fm.erros.salario} nome="salario">
            <input type="text" name="salario" inputMode="decimal" placeholder="2.500,00" value={v.salario} onChange={(e) => setV((a) => ({ ...a, salario: e.target.value.replace(/[^\d.,]/g, '') }))} {...aria('salario', fm.erros.salario)} />
          </Campo>
        ) : null}
        <Campo rotulo="O que a pessoa vai fazer" erro={fm.erros.descricao} nome="descricao">
          <textarea name="descricao" maxLength={4000} value={v.descricao} onChange={muda('descricao')} {...aria('descricao', fm.erros.descricao)} />
        </Campo>
        <Campo rotulo="Requisitos" erro={fm.erros.requisitos} nome="requisitos">
          <textarea name="requisitos" maxLength={2000} value={v.requisitos} onChange={muda('requisitos')} {...aria('requisitos', fm.erros.requisitos)} />
        </Campo>
        <Campo rotulo="Benefícios" erro={fm.erros.beneficios} nome="beneficios">
          <textarea name="beneficios" maxLength={2000} value={v.beneficios} onChange={muda('beneficios')} {...aria('beneficios', fm.erros.beneficios)} />
        </Campo>
        <button className="btn" disabled={fm.pendente}>{fm.pendente ? 'Publicando…' : 'Publicar e gerar a arte'}</button>
      </form>
      </div>
      <aside className="publicar-lateral" aria-label="Prévia da arte">
        <ArteCanvas
          rotulo="Prévia da arte da vaga"
          dados={{ titulo: v.titulo.trim() || 'Cargo da vaga', empresa: v.empresa.trim() || 'Sua empresa', cidade: `${c.nome} - ${c.uf}`, contrato: v.contrato, modalidade: v.modalidade, salario, destaques: destaquesDe(v.beneficios), ...destinoDaArte(link, 'vaga', '', v.titulo) }}
          opcoes={{ modelo: 'cartao', formato: 'feed', fundo: ARTE_PADRAO.fundo, destaque: ARTE_PADRAO.destaque, texto: ARTE_PADRAO.texto, chamada: ARTE_PADRAO.chamada, marca: true, fonte: 'inter', qrEstilo: 'suave' }}
        />
        <p className="nota">Depois de publicar, você escolhe modelo, cores, fonte, foto e o QR Code da vaga ou do seu WhatsApp.</p>
      </aside>
    </div>
  );
}
