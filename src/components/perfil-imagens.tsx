'use client';

import { BASE } from '@/lib/base';
import { useId, useState } from 'react';

type Envio = { url?: string; erro?: string };

// Botão que escolhe a imagem e já envia: sem "salvar" depois, como trocar a foto num aplicativo.
function BotaoImagem({ rota, rotulo, classe = 'btn btn-claro btn-peq', aoEnviar, aoErro }: { rota: string; rotulo: string; classe?: string; aoEnviar: (url: string) => void; aoErro: (m: string) => void }) {
  const id = useId();
  const [enviando, setEnviando] = useState(false);
  return (
    <span className="botao-imagem">
      <input id={id} className="so-leitor" type="file" accept="image/png,image/jpeg,image/webp" disabled={enviando} onChange={async (e) => {
        const f = e.target.files?.[0];
        e.target.value = '';
        if (!f) return;
        setEnviando(true);
        try {
          const d = new FormData();
          d.set('arquivo', f);
          const j = (await (await fetch(rota, { method: 'POST', body: d })).json()) as Envio;
          if (j.url) aoEnviar(j.url);
          else aoErro(j.erro ?? 'Não foi possível enviar a imagem.');
        } catch {
          aoErro('Não foi possível enviar a imagem. Confira a internet e tente de novo.');
        }
        setEnviando(false);
      }} />
      <label htmlFor={id} className={classe} aria-disabled={enviando || undefined}>{enviando ? 'Enviando…' : rotulo}</label>
    </span>
  );
}

async function tirar(rota: string) {
  const r = await fetch(rota, { method: 'DELETE' });
  return r.ok;
}

const inicial = (n: string) => n.trim().charAt(0).toUpperCase() || '?';

// Capa larga com o logo por cima, do mesmo jeito que aparece na página pública da empresa.
export function CapaEmpresaEditor({ empresaId, nome, temCapa, temLogo }: { empresaId: string; nome: string; temCapa: boolean; temLogo: boolean }) {
  const [capa, setCapa] = useState(temCapa ? `${BASE}/api/capa/${empresaId}` : null);
  const [logo, setLogo] = useState(temLogo ? `${BASE}/api/logo/${empresaId}` : null);
  const [erro, setErro] = useState('');
  return (
    <div className="perfil-imagens">
      <div className="perfil-capa">
        {capa ? <img src={capa} alt="Capa atual" /> : null}
        <div className="perfil-capa-acoes">
          <BotaoImagem rota={`${BASE}/api/capa`} rotulo={capa ? 'Trocar capa' : 'Pôr uma capa'} classe="btn btn-claro btn-peq btn-vidro" aoEnviar={(u) => { setCapa(u); setErro(''); }} aoErro={setErro} />
          {capa ? <button type="button" className="btn btn-claro btn-peq btn-vidro" onClick={async () => { if (await tirar(`${BASE}/api/capa`)) setCapa(null); }}>Tirar</button> : null}
        </div>
      </div>
      <div className="perfil-pe">
        {logo ? <img className="perfil-avatar" src={logo} alt="Logo atual" /> : <span className="perfil-avatar perfil-avatar-inicial" aria-hidden="true">{inicial(nome)}</span>}
        <div className="linha-botoes">
          <BotaoImagem rota={`${BASE}/api/logo`} rotulo={logo ? 'Trocar logo' : 'Enviar logo'} aoEnviar={(u) => { setLogo(u); setErro(''); }} aoErro={setErro} />
          {logo ? <button type="button" className="btn btn-claro btn-peq" onClick={async () => { if (await tirar(`${BASE}/api/logo`)) setLogo(null); }}>Tirar logo</button> : null}
        </div>
        <p className="nota">Capa em JPG, PNG ou WebP de até 3 MB, de preferência larga (1600 × 400). Logo de até 1 MB.</p>
        {erro ? <p className="aviso aviso-erro" role="alert">{erro}</p> : null}
      </div>
    </div>
  );
}

// Foto do candidato: só a foto, sem capa. Quem vê é quem já pode ver o currículo.
export function FotoCandidato({ id, nome, temFoto }: { id: string; nome: string; temFoto: boolean }) {
  const [foto, setFoto] = useState(temFoto ? `${BASE}/api/foto/${id}` : null);
  const [erro, setErro] = useState('');
  return (
    <section className="cv-bloco perfil-foto">
      {foto ? <img className="perfil-avatar" src={foto} alt="Sua foto" /> : <span className="perfil-avatar perfil-avatar-inicial" aria-hidden="true">{inicial(nome)}</span>}
      <div className="perfil-foto-texto">
        <h2>Sua foto</h2>
        <p className="nota">Aparece no seu currículo para as empresas às quais você se candidatar. JPG, PNG ou WebP de até 2 MB.</p>
        <div className="linha-botoes">
          <BotaoImagem rota={`${BASE}/api/foto`} rotulo={foto ? 'Trocar foto' : 'Enviar foto'} aoEnviar={(u) => { setFoto(u); setErro(''); }} aoErro={setErro} />
          {foto ? <button type="button" className="btn btn-claro btn-peq" onClick={async () => { if (await tirar(`${BASE}/api/foto`)) setFoto(null); }}>Tirar foto</button> : null}
        </div>
        {erro ? <p className="aviso aviso-erro" role="alert">{erro}</p> : null}
      </div>
    </section>
  );
}
