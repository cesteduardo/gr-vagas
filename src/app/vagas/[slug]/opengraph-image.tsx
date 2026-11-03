import { ImageResponse } from 'next/og';
import { banco } from '@/lib/db/client';
import { formatarSalario } from '@/lib/texto';
import { vagaPublica } from '@/lib/vagas';

export const alt = 'Arte da vaga';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Imagem({ params }: { params: Promise<{ slug: string }> }) {
  const v = await vagaPublica(await banco(), (await params).slug);
  return new ImageResponse(
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 64, background: '#0A2F5C', color: '#FFFFFF' }}>
      <div style={{ fontSize: 42, fontWeight: 700 }}>{v?.empresaNome ?? 'GR Vagas'}</div>
      <div style={{ fontSize: (v?.titulo.length ?? 0) > 40 ? 68 : 96, fontWeight: 600, letterSpacing: '-0.04em', lineHeight: 1.04 }}>{v?.titulo ?? 'Vaga de emprego'}</div>
      <div style={{ display: 'flex', flexDirection: 'column', fontSize: 34 }}>
        <span>{v ? `${v.contrato}, ${v.cidade} - ${v.uf}` : ''}</span>
        <span>{v ? `Salário: ${formatarSalario(v.salarioCentavos)}` : ''}</span>
      </div>
    </div>,
    size,
  );
}
