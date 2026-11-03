'use client';

import { useRef, useState, type DragEvent } from 'react';
import type { DadosCurriculo } from '@/lib/ia/curriculo';

export type VagaSugerida = { id: string; slug: string; titulo: string; empresa: string; cidade: string; contrato: string; salario: string };

export function SoltarCurriculo({ aoLer, titulo, detalhe }: { aoLer: (d: DadosCurriculo, vagas: VagaSugerida[]) => void; titulo: string; detalhe: string }) {
  const entrada = useRef<HTMLInputElement>(null);
  const [estado, setEstado] = useState<'livre' | 'sobre' | 'lendo' | 'lido'>('livre');
  const [nome, setNome] = useState('');
  const [erro, setErro] = useState<string | null>(null);

  const ler = async (arquivo: File | undefined) => {
    if (!arquivo) return;
    setErro(null);
    setEstado('lendo');
    setNome(arquivo.name);
    const d = new FormData();
    d.set('arquivo', arquivo);
    try {
      const r = await fetch('/api/ia/curriculo', { method: 'POST', body: d });
      const j = (await r.json()) as { dados?: DadosCurriculo; vagas?: VagaSugerida[]; erro?: string };
      if (!r.ok || !j.dados) {
        setErro(j.erro ?? 'Não foi possível ler o arquivo.');
        setEstado('livre');
        if (entrada.current) entrada.current.value = '';
        return;
      }
      setEstado('lido');
      aoLer(j.dados, j.vagas ?? []);
    } catch {
      setErro('Não foi possível ler o arquivo. Verifique a conexão e tente de novo.');
      setEstado('livre');
    }
  };

  const soltar = (e: DragEvent) => {
    e.preventDefault();
    const arquivos = e.dataTransfer.files;
    if (entrada.current && arquivos.length) entrada.current.files = arquivos;
    void ler(arquivos[0]);
  };

  return (
    <>
      <label className={`soltar soltar-${estado}`} onDragOver={(e) => { e.preventDefault(); setEstado('sobre'); }} onDragLeave={() => setEstado('livre')} onDrop={soltar}>
        <input ref={entrada} className="so-leitor" type="file" name="curriculo" accept="application/pdf" onChange={(e) => void ler(e.target.files?.[0])} />
        <span className="soltar-icone" aria-hidden="true">
          <svg viewBox="0 0 24 24"><path d="M12 16V5M7 10l5-5 5 5M5 19h14" /></svg>
        </span>
        <strong>{estado === 'lendo' ? 'Lendo seu currículo…' : estado === 'lido' ? nome : titulo}</strong>
        <span className="nota">{estado === 'lido' ? 'Confira os dados abaixo. Toque aqui para trocar o arquivo.' : detalhe}</span>
      </label>
      {erro ? <p className="aviso aviso-erro" role="alert">{erro}</p> : null}
    </>
  );
}
