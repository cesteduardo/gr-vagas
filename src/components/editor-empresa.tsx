'use client';

import { BASE } from '@/lib/base';
import { useState, type ReactNode } from 'react';
import { acaoSalvarEmpresa } from '@/app/acoes';
import { AREAS, CIDADES } from '@/lib/config';
import { formatarCnpj, TAMANHOS, type PerfilEmpresa } from '@/lib/empresa';
import { formatarTelefone, normalizarTelefone } from '@/lib/forms/validators';
import { CapaEmpresaEditor } from './perfil-imagens';
import { Selecao } from './selecao';

function Bloco({ numero, titulo, nota, children }: { numero: number; titulo: string; nota?: string; children: ReactNode }) {
  return (
    <section className="cv-bloco">
      <div className="cv-bloco-topo"><h2><span>{numero}</span>{titulo}</h2></div>
      {nota ? <p className="nota">{nota}</p> : null}
      <div className="cv-grade">{children}</div>
    </section>
  );
}

export function EditorEmpresa({ inicial }: { inicial: { id: string; nome: string; descricao: string; perfil: PerfilEmpresa; temLogo: boolean; temCapa: boolean; slug: string } }) {
  const [nome, setNome] = useState(inicial.nome);
  const [descricao, setDescricao] = useState(inicial.descricao);
  const [p, setP] = useState<PerfilEmpresa>(inicial.perfil);
  const [estado, setEstado] = useState<{ ok?: boolean; erros?: Record<string, string>; erro?: string }>({});
  const [salvando, setSalvando] = useState(false);
  const muda = (m: Partial<PerfilEmpresa>) => setP((a) => ({ ...a, ...m }));
  const erro = (k: string) => estado.erros?.[k];
  const inv = (k: string) => (erro(k) ? { 'aria-invalid': true as const } : {});
  const msg = (k: string) => (erro(k) ? <span className="erro">{erro(k)}</span> : null);

  return (
    <form className="pilha" noValidate onSubmit={async (e) => {
      e.preventDefault();
      setSalvando(true);
      const r = await acaoSalvarEmpresa({ nome, descricao, perfil: p });
      setEstado(r);
      setSalvando(false);
      if (r.erros) requestAnimationFrame(() => document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());
    }}>
      <Bloco numero={1} titulo="Identidade">
        <label className="campo inteiro"><span>Nome da empresa</span><input type="text" name="empresa" maxLength={80} value={nome} onChange={(e) => setNome(e.target.value)} {...inv('empresa')} />{msg('empresa')}</label>
        <div className="campo inteiro">
          <span>Capa e logo</span>
          <CapaEmpresaEditor empresaId={inicial.id} nome={nome} temCapa={inicial.temCapa} temLogo={inicial.temLogo} />
        </div>
      </Bloco>

      <Bloco numero={2} titulo="Sobre a empresa">
        <label className="campo"><span>Setor</span><Selecao value={p.setor ?? ''} onChange={(e) => muda({ setor: e.target.value })}><option value="">Escolha</option>{AREAS.map((a) => <option key={a}>{a}</option>)}</Selecao></label>
        <label className="campo"><span>Tamanho</span><Selecao value={p.tamanho ?? ''} onChange={(e) => muda({ tamanho: e.target.value })}>{TAMANHOS.map((t) => <option key={t} value={t}>{t || 'Escolha'}</option>)}</Selecao></label>
        <label className="campo"><span>Ano de fundação</span><input type="text" inputMode="numeric" placeholder="2015" value={p.fundacao ?? ''} onChange={(e) => muda({ fundacao: e.target.value.replace(/\D/g, '').slice(0, 4) })} /></label>
        <label className="campo inteiro"><span>Quem somos</span><textarea name="descricao" maxLength={2000} placeholder="O que a empresa faz, há quanto tempo e para quem." value={descricao} onChange={(e) => setDescricao(e.target.value)} {...inv('descricao')} />{msg('descricao')}</label>
        <label className="campo inteiro"><span>Por que trabalhar aqui</span><textarea maxLength={1200} placeholder="Ambiente, crescimento, horários, o que faz as pessoas ficarem." value={p.porQue ?? ''} onChange={(e) => muda({ porQue: e.target.value })} {...inv('porQue')} />{msg('porQue')}</label>
      </Bloco>

      <Bloco numero={3} titulo="Contato e local" nota="Aparecem na página pública da empresa.">
        <label className="campo"><span>Cidade</span><Selecao value={p.cidadeSlug ?? ''} onChange={(e) => muda({ cidadeSlug: e.target.value })}><option value="">Escolha</option>{CIDADES.map((c) => <option key={c.slug} value={c.slug}>{c.nome}</option>)}</Selecao></label>
        <label className="campo"><span>WhatsApp da empresa</span><input type="tel" inputMode="numeric" placeholder="(17) 99999-9999" value={formatarTelefone(p.whatsapp ?? '')} onChange={(e) => muda({ whatsapp: normalizarTelefone(e.target.value) })} {...inv('whatsapp')} />{msg('whatsapp')}</label>
        <label className="campo inteiro"><span>Endereço</span><input type="text" maxLength={160} placeholder="Rua, número e bairro" value={p.endereco ?? ''} onChange={(e) => muda({ endereco: e.target.value })} /></label>
        <label className="campo"><span>Site</span><input type="text" maxLength={120} placeholder="suaempresa.com.br" value={p.site ?? ''} onChange={(e) => muda({ site: e.target.value })} /></label>
        <label className="campo"><span>Instagram</span><input type="text" maxLength={40} placeholder="@suaempresa" value={p.instagram ? `@${p.instagram}` : ''} onChange={(e) => muda({ instagram: e.target.value.replace(/^@/, '') })} /></label>
      </Bloco>

      <Bloco numero={4} titulo="Dados legais" nota="Opcionais. Ajudam o candidato a confiar na vaga.">
        <label className="campo"><span>Razão social</span><input type="text" maxLength={120} value={p.razaoSocial ?? ''} onChange={(e) => muda({ razaoSocial: e.target.value })} /></label>
        <label className="campo"><span>CNPJ</span><input type="text" inputMode="numeric" placeholder="00.000.000/0000-00" value={formatarCnpj(p.cnpj ?? '')} onChange={(e) => muda({ cnpj: e.target.value.replace(/\D/g, '').slice(0, 14) })} {...inv('cnpj')} />{msg('cnpj')}</label>
      </Bloco>

      <div className="painel-caixa linha-botoes">
        <button className="btn" disabled={salvando}>{salvando ? 'Salvando…' : 'Salvar dados'}</button>
        <a className="btn btn-claro" href={`${BASE}/empresas/${inicial.slug}`} target="_blank" rel="noopener">Ver página pública</a>
        {estado.ok ? <span className="aviso aviso-ok" role="status">Dados da empresa salvos.</span> : null}
        {estado.erro ? <span className="aviso aviso-erro" role="alert">{estado.erro}</span> : null}
      </div>
    </form>
  );
}
