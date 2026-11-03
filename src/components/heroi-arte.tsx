'use client';

import { type CSSProperties } from 'react';
import { destinoDaArte } from '@/lib/arte/dados';
import { FORMATOS, type FonteId, type FormatoId, type ModeloId } from '@/lib/arte/modelos';
import { CIDADE_PRINCIPAL } from '@/lib/config';
import { ArteCanvas } from './arte-canvas';
import { Carrossel } from './carrossel';

// Artes de verdade, desenhadas ao vivo, mostrando cores e fontes à escolha.
const ARTES: { modelo: ModeloId; formato: FormatoId; fonte: FonteId; fundo: string; destaque: string; texto: string; exemplo: string; contrato: string; salario: string }[] = [
  { modelo: 'poster', formato: 'retrato', fonte: 'inter', fundo: '#DCEBFB', destaque: '#7FAEE3', texto: '#14213D', exemplo: 'Auxiliar administrativo', contrato: 'CLT', salario: 'R$ 2.200,00' },
  { modelo: 'ingresso', formato: 'retrato', fonte: 'poppins', fundo: '#FFE7D9', destaque: '#F79C6B', texto: '#3B1F10', exemplo: 'Recepcionista', contrato: 'CLT', salario: 'R$ 2.100,00' },
  { modelo: 'dividida', formato: 'feed', fonte: 'playfair', fundo: '#E9E3F8', destaque: '#A493DE', texto: '#241B45', exemplo: 'Técnico de enfermagem', contrato: 'CLT', salario: 'R$ 2.800,00' },
  { modelo: 'bolhas', formato: 'retrato', fonte: 'manrope', fundo: '#DDF2E7', destaque: '#6DBE9B', texto: '#10312A', exemplo: 'Vendedor de loja', contrato: 'CLT', salario: 'A combinar' },
  { modelo: 'tipografica', formato: 'retrato', fonte: 'montserrat', fundo: '#FFE7D9', destaque: '#F79C6B', texto: '#23262E', exemplo: 'Motorista de entregas', contrato: 'Temporário', salario: 'R$ 2.600,00' },
  { modelo: 'lista', formato: 'feed', fonte: 'dmsans', fundo: '#F3EDE3', destaque: '#E79AAB', texto: '#3D1721', exemplo: 'Designer gráfico', contrato: 'PJ', salario: 'A combinar' },
];
const proporcao = (f: FormatoId) => {
  const x = FORMATOS.find((a) => a.id === f)!;
  return `${x.largura} / ${x.altura}`;
};

export function FaixaArtes({ link, titulo = '', empresa = '' }: { link: string; titulo?: string; empresa?: string }) {
  return (
    <div className="embrulho-largo">
      <Carrossel rotulo="Exemplos de arte de vaga" classe="artes" intervalo={5000}>
        {ARTES.map((a, i) => {
          const nome = titulo.trim() || a.exemplo;
          return (
            <div key={`${a.modelo}-${i}`} className="faixa-item" style={{ '--r': proporcao(a.formato) } as CSSProperties}>
              <ArteCanvas
                rotulo={`Exemplo de arte de vaga no modelo ${a.modelo}`}
                dados={{ titulo: nome, empresa: empresa.trim() || 'Sua empresa', cidade: `${CIDADE_PRINCIPAL.nome} - ${CIDADE_PRINCIPAL.uf}`, contrato: a.contrato, modalidade: 'Presencial', salario: a.salario, destaques: ['Vale-transporte', 'Vale-refeição', 'Plano de saúde'], ...destinoDaArte(link, 'vaga', '', nome) }}
                opcoes={{ modelo: a.modelo, formato: a.formato, fundo: a.fundo, destaque: a.destaque, texto: a.texto, chamada: 'Estamos contratando', marca: false, fonte: a.fonte, qrEstilo: i % 2 ? 'pontos' : 'suave' }}
              />
            </div>
          );
        })}
      </Carrossel>
    </div>
  );
}
