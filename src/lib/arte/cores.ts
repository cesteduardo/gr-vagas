const canal = (v: number) => {
  const c = v / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};

export function luminancia(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  return 0.2126 * canal((n >> 16) & 255) + 0.7152 * canal((n >> 8) & 255) + 0.0722 * canal(n & 255);
}

export function contraste(a: string, b: string): number {
  const [c, d] = [luminancia(a), luminancia(b)];
  return (Math.max(c, d) + 0.05) / (Math.min(c, d) + 0.05);
}

export const TINTA = '#14161B';

// Quem manda é a escolha do contratante; só corrige quando o texto ficaria ilegível.
export function textoLegivel(fundo: string, preferido?: string): string {
  if (preferido && contraste(fundo, preferido) >= 4.5) return preferido;
  return [TINTA, '#FFFFFF', '#000000'].find((c) => contraste(fundo, c) >= 4.5) ?? '#000000';
}
