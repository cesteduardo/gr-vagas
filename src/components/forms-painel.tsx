'use client';

import { BASE } from '@/lib/base';
import { Selecao } from '@/components/selecao';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { Acrescimos } from '@/lib/perfil-do-curriculo';
import { resumoDoEnvio } from '@/lib/resumo-envio';
import { acaoCriarAlerta, acaoEditarVaga, acaoEmpresa, acaoExcluirConta, acaoPerfil } from '@/app/acoes';
import { AREAS, CIDADES, CONTRATOS, MODALIDADES } from '@/lib/config';
import { errosVaga } from '@/lib/forms/vaga';
import { CampoArquivo } from './campo-arquivo';
import { aria, AvisoLink, Campo, pega, useFormulario } from './formulario-base';

export type VagaEdicao = { id: string; titulo: string; area: string; contrato: string; modalidade: string; cidadeSlug: string; salarioCentavos: number | null; descricao: string; requisitos: string; beneficios: string };

export function FormEditarVaga({ v }: { v: VagaEdicao }) {
  const [tipo, setTipo] = useState(v.salarioCentavos === null ? 'combinar' : 'valor');
  const fm = useFormulario(acaoEditarVaga, (f) => errosVaga({ titulo: pega(f, 'titulo'), area: pega(f, 'area'), contrato: pega(f, 'contrato'), modalidade: pega(f, 'modalidade'), cidade: pega(f, 'cidade'), salarioTipo: pega(f, 'salarioTipo'), salario: pega(f, 'salario'), descricao: pega(f, 'descricao'), requisitos: pega(f, 'requisitos'), beneficios: pega(f, 'beneficios') }));
  return (
    <form ref={fm.ref} action={fm.despachar} onSubmit={fm.aoEnviar} noValidate className="pilha" style={{ maxWidth: 760 }}>
      {fm.estado.erro ? <p className="aviso aviso-erro" role="alert">{fm.estado.erro}</p> : null}
      <AvisoLink estado={fm.estado} />
      <input type="hidden" name="vagaId" value={v.id} />
      <Campo rotulo="Cargo" erro={fm.erros.titulo} nome="titulo"><input type="text" name="titulo" maxLength={80} defaultValue={v.titulo} {...aria('titulo', fm.erros.titulo)} /></Campo>
      <div className="duas-col">
        <Campo rotulo="Área" erro={fm.erros.area} nome="area"><Selecao name="area" defaultValue={v.area} {...aria('area', fm.erros.area)}>{AREAS.map((a) => <option key={a}>{a}</option>)}</Selecao></Campo>
        <Campo rotulo="Cidade" erro={fm.erros.cidade} nome="cidade"><Selecao name="cidade" defaultValue={v.cidadeSlug} {...aria('cidade', fm.erros.cidade)}>{CIDADES.map((x) => <option key={x.slug} value={x.slug}>{x.nome}</option>)}</Selecao></Campo>
        <Campo rotulo="Contrato" erro={fm.erros.contrato} nome="contrato"><Selecao name="contrato" defaultValue={v.contrato} {...aria('contrato', fm.erros.contrato)}>{CONTRATOS.map((x) => <option key={x}>{x}</option>)}</Selecao></Campo>
        <Campo rotulo="Modalidade" erro={fm.erros.modalidade} nome="modalidade"><Selecao name="modalidade" defaultValue={v.modalidade} {...aria('modalidade', fm.erros.modalidade)}>{MODALIDADES.map((x) => <option key={x}>{x}</option>)}</Selecao></Campo>
      </div>
      <fieldset className="grupo-radio">
        <legend>Salário</legend>
        <label className="opcao"><input type="radio" name="salarioTipo" value="combinar" checked={tipo === 'combinar'} onChange={() => setTipo('combinar')} />A combinar</label>
        <label className="opcao"><input type="radio" name="salarioTipo" value="valor" checked={tipo === 'valor'} onChange={() => setTipo('valor')} />Informar valor</label>
      </fieldset>
      {tipo === 'valor' ? <Campo rotulo="Valor mensal em reais" erro={fm.erros.salario} nome="salario"><input type="text" name="salario" inputMode="decimal" defaultValue={v.salarioCentavos ? (v.salarioCentavos / 100).toFixed(2).replace('.', ',') : ''} {...aria('salario', fm.erros.salario)} /></Campo> : null}
      <Campo rotulo="O que a pessoa vai fazer" erro={fm.erros.descricao} nome="descricao"><textarea name="descricao" maxLength={4000} defaultValue={v.descricao} {...aria('descricao', fm.erros.descricao)} /></Campo>
      <Campo rotulo="Requisitos" erro={fm.erros.requisitos} nome="requisitos"><textarea name="requisitos" maxLength={2000} defaultValue={v.requisitos} {...aria('requisitos', fm.erros.requisitos)} /></Campo>
      <Campo rotulo="Benefícios" erro={fm.erros.beneficios} nome="beneficios"><textarea name="beneficios" maxLength={2000} defaultValue={v.beneficios} {...aria('beneficios', fm.erros.beneficios)} /></Campo>
      <div><button className="btn" disabled={fm.pendente}>Salvar alterações</button></div>
    </form>
  );
}

export function FormEmpresa({ nome, descricao }: { nome: string; descricao: string }) {
  const fm = useFormulario(acaoEmpresa, (f) => ({ empresa: pega(f, 'empresa').trim().length >= 2 ? null : 'Informe o nome da empresa.', descricao: pega(f, 'descricao').trim().length >= 10 ? null : 'Escreva pelo menos 10 caracteres sobre a empresa.' }));
  return (
    <form ref={fm.ref} action={fm.despachar} onSubmit={fm.aoEnviar} noValidate className="pilha painel-caixa">
      <AvisoLink estado={fm.estado} />
      <Campo rotulo="Nome da empresa" erro={fm.erros.empresa} nome="empresa"><input type="text" name="empresa" maxLength={80} defaultValue={nome} {...aria('empresa', fm.erros.empresa)} /></Campo>
      <Campo rotulo="Sobre a empresa" erro={fm.erros.descricao} nome="descricao"><textarea name="descricao" maxLength={2000} defaultValue={descricao} {...aria('descricao', fm.erros.descricao)} /></Campo>
      <div><button className="btn" disabled={fm.pendente}>Salvar dados</button></div>
    </form>
  );
}

export function FormPerfil({ inicial }: { inicial: { titulo: string; cidadeSlug: string; resumo: string; talentos: boolean } }) {
  const fm = useFormulario(acaoPerfil, (f) => ({ titulo: pega(f, 'titulo').trim().length >= 3 ? null : 'Escreva o que você faz.', cidade: pega(f, 'cidade') ? null : 'Escolha a cidade.', resumo: pega(f, 'resumo').trim().length >= 20 ? null : 'Escreva pelo menos 20 caracteres.' }));
  return (
    <form ref={fm.ref} action={fm.despachar} onSubmit={fm.aoEnviar} noValidate className="pilha painel-caixa">
      <AvisoLink estado={fm.estado} />
      <Campo rotulo="O que você faz" erro={fm.erros.titulo} nome="titulo"><input type="text" name="titulo" maxLength={80} placeholder="Recepcionista" defaultValue={inicial.titulo} {...aria('titulo', fm.erros.titulo)} /></Campo>
      <Campo rotulo="Cidade" erro={fm.erros.cidade} nome="cidade"><Selecao name="cidade" defaultValue={inicial.cidadeSlug} {...aria('cidade', fm.erros.cidade)}><option value="">Escolha</option>{CIDADES.map((c) => <option key={c.slug} value={c.slug}>{c.nome}</option>)}</Selecao></Campo>
      <Campo rotulo="Experiência e formação" erro={fm.erros.resumo} nome="resumo"><textarea name="resumo" maxLength={2000} defaultValue={inicial.resumo} {...aria('resumo', fm.erros.resumo)} /></Campo>
      <label className="aceite"><input type="checkbox" name="talentos" defaultChecked={inicial.talentos} /><span>Aceito aparecer no banco de talentos: empresas assinantes podem ver meu nome, contato, perfil e currículo e me chamar para vagas. Posso retirar este aceite quando quiser.</span></label>
      <div><button className="btn" disabled={fm.pendente}>Salvar perfil</button></div>
    </form>
  );
}

export function EnviarCurriculo({ nomeAtual, candidatoId }: { nomeAtual: string | null; candidatoId: string }) {
  const [nome, setNome] = useState(nomeAtual);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const router = useRouter();
  return (
    <div className="painel-caixa pilha">
      <h2 style={{ fontSize: '1.6rem' }}>Currículo</h2>
      {nome ? <p>Arquivo atual: <a href={`${BASE}/api/curriculo/${candidatoId}`}>{nome}</a></p> : <p className="leve">Envie um PDF para as empresas verem junto com as suas candidaturas.</p>}
      <div className="campo">
        <span>Arquivo em PDF, até 3 MB</span>
        <CampoArquivo
          id="arquivo-curriculo"
          accept="application/pdf"
          rotulo="Escolher PDF"
          disabled={enviando}
          onChange={async (e) => {
            const arquivo = e.target.files?.[0];
            if (!arquivo) return;
            setErro(null);
            setEnviando(true);
            const d = new FormData();
            d.set('arquivo', arquivo);
            try {
              const r = await fetch(`${BASE}/api/curriculo`, { method: 'POST', body: d });
              const j = (await r.json()) as { nome?: string; erro?: string; acrescimos?: Acrescimos; combinam?: number };
              if (r.ok && j.nome) {
                setNome(j.nome);
                setAviso(resumoDoEnvio(j.acrescimos, j.combinam));
                // As vagas sugeridas da página vêm do perfil, que acabou de mudar.
                router.refresh();
              } else setErro(j.erro ?? 'Não foi possível enviar o arquivo.');
            } catch {
              setErro('Não foi possível enviar o arquivo. Verifique a conexão e tente de novo.');
            }
            setEnviando(false);
            e.target.value = '';
          }}
        />
      </div>
      {aviso ? <p className="aviso aviso-ok" role="status">{aviso}</p> : null}
      {erro ? <p className="aviso aviso-erro" role="alert">{erro}</p> : null}
    </div>
  );
}

export function FormAlerta() {
  const fm = useFormulario(acaoCriarAlerta, (f) => ({ termo: pega(f, 'termo').trim().length >= 2 ? null : 'Escreva o cargo ou a palavra que você procura.', cidade: pega(f, 'cidade') ? null : 'Escolha a cidade.' }), true);
  return (
    <form ref={fm.ref} action={fm.despachar} onSubmit={fm.aoEnviar} noValidate className="pilha painel-caixa">
      <AvisoLink estado={fm.estado} />
      <div className="duas-col">
        <Campo rotulo="Cargo ou palavra" erro={fm.erros.termo} nome="termo"><input type="text" name="termo" maxLength={80} {...aria('termo', fm.erros.termo)} /></Campo>
        <Campo rotulo="Cidade" erro={fm.erros.cidade} nome="cidade"><Selecao name="cidade" defaultValue="sao-jose-do-rio-preto" {...aria('cidade', fm.erros.cidade)}>{CIDADES.map((c) => <option key={c.slug} value={c.slug}>{c.nome}</option>)}</Selecao></Campo>
      </div>
      <div><button className="btn" disabled={fm.pendente}>Criar alerta</button></div>
    </form>
  );
}

export function FormExcluirConta() {
  const fm = useFormulario(acaoExcluirConta, (f) => ({ confirmar: pega(f, 'confirmar').trim().toLowerCase() === 'excluir' ? null : 'Digite excluir para confirmar.' }));
  return (
    <form ref={fm.ref} action={fm.despachar} onSubmit={fm.aoEnviar} noValidate className="pilha">
      <Campo rotulo="Digite excluir para confirmar" erro={fm.erros.confirmar} nome="confirmar"><input type="text" name="confirmar" autoComplete="off" {...aria('confirmar', fm.erros.confirmar)} /></Campo>
      <div><button className="btn btn-perigo" disabled={fm.pendente}>Excluir minha conta</button></div>
    </form>
  );
}
