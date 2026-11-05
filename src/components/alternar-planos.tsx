'use client';

import { useState, type ReactNode } from 'react';
import { Segmentado } from './segmentado';

const LADOS = [{ id: 'empresa' as const, nome: 'Para empresas' }, { id: 'candidato' as const, nome: 'Para candidatos' }];

// Um grupo de planos por vez: quem contrata não precisa rolar pelos planos de candidato, e vice-versa.
export function AlternarPlanos({ inicial, empresa, candidato }: { inicial: 'empresa' | 'candidato'; empresa: ReactNode; candidato: ReactNode }) {
  const [lado, setLado] = useState(inicial);
  return (
    <>
      <div className="planos-lado"><Segmentado rotulo="Planos para" opcoes={LADOS} valor={lado} muda={setLado} /></div>
      <div hidden={lado !== 'empresa'}>{empresa}</div>
      <div hidden={lado !== 'candidato'}>{candidato}</div>
    </>
  );
}
