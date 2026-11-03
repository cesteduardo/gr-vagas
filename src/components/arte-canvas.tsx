'use client';

import '@fontsource/poppins/400.css';
import '@fontsource/poppins/500.css';
import '@fontsource/poppins/600.css';
import '@fontsource/tinos/400.css';
import '@fontsource/tinos/700.css';
import '@fontsource-variable/dm-sans/wght.css';
import '@fontsource-variable/lora/wght.css';
import '@fontsource-variable/manrope/wght.css';
import '@fontsource-variable/montserrat/wght.css';
import '@fontsource-variable/nunito/wght.css';
import '@fontsource-variable/playfair-display/wght.css';
import { useEffect, useRef } from 'react';
import { carregarFonte, desenharArte } from '@/lib/arte/desenhar';
import type { DadosArte, OpcoesArte } from '@/lib/arte/layout';

export type DadosCanvas = Omit<DadosArte, 'temLogo' | 'temImagem'> & { qr: string };
export type OpcoesCanvas = OpcoesArte & { fonte: string; qrEstilo: 'suave' | 'pontos'; focoX?: number; focoY?: number };

const cache = new Map<string, Promise<HTMLImageElement | null>>();
function carregarImagem(url: string | null | undefined) {
  if (!url) return Promise.resolve(null);
  let p = cache.get(url);
  if (!p) {
    const img = new Image();
    img.src = url;
    p = img.decode().then(() => img).catch(() => null);
    cache.set(url, p);
  }
  return p;
}

export function ArteCanvas({ dados, opcoes, logoUrl, imagemUrl, rotulo, aoDesenhar }: { dados: DadosCanvas; opcoes: OpcoesCanvas; logoUrl?: string | null; imagemUrl?: string | null; rotulo: string; aoDesenhar?: (c: HTMLCanvasElement) => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const chave = JSON.stringify([dados, opcoes, logoUrl, imagemUrl]);

  useEffect(() => {
    let vivo = true;
    (async () => {
      const [, logo, imagem] = await Promise.all([carregarFonte(opcoes.fonte), carregarImagem(logoUrl), carregarImagem(imagemUrl)]);
      if (!vivo || !ref.current) return;
      desenharArte(ref.current, { ...dados, temLogo: Boolean(logo), temImagem: Boolean(imagem) }, opcoes, logo, imagem);
      aoDesenhar?.(ref.current);
    })();
    return () => {
      vivo = false;
    };
    // A chave resume dados, opções e imagens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chave]);

  return <canvas ref={ref} width={1080} height={1080} role="img" aria-label={rotulo} data-arte="" />;
}
