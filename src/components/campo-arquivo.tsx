'use client';

import { useState, type ChangeEvent } from 'react';

// Escolha de arquivo no estilo do site, mostrando o nome do que foi escolhido.
export function CampoArquivo({ id, accept, rotulo = 'Escolher arquivo', disabled, onChange }: { id: string; accept: string; rotulo?: string; disabled?: boolean; onChange: (e: ChangeEvent<HTMLInputElement>) => void }) {
  const [nome, setNome] = useState('');
  return (
    <span className="arquivo">
      <input id={id} className="so-leitor" type="file" accept={accept} disabled={disabled} onChange={(e) => { setNome(e.target.files?.[0]?.name ?? ''); onChange(e); }} />
      <label htmlFor={id} className="btn btn-claro btn-peq">{rotulo}</label>
      <span className="nota arquivo-nome">{nome || 'Nenhum arquivo escolhido'}</span>
    </span>
  );
}
