export const normalizar = (t: string) => t.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

export const paraSlug = (t: string) => normalizar(t).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40).replace(/-+$/, '');

export const formatarSalario = (centavos: number | null) => (centavos === null ? 'A combinar' : (centavos / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }));

export function lerSalario(bruto: string): number | null {
  const limpo = bruto.replace(/[^\d,.]/g, '');
  if (!limpo) return null;
  const virgula = limpo.lastIndexOf(',');
  const inteiro = (virgula >= 0 ? limpo.slice(0, virgula) : limpo).replace(/\D/g, '');
  const decimal = virgula >= 0 ? limpo.slice(virgula + 1).replace(/\D/g, '').padEnd(2, '0').slice(0, 2) : '00';
  const valor = Number(inteiro || '0') * 100 + Number(decimal);
  return Number.isSafeInteger(valor) ? valor : null;
}

export const linkWhatsapp = (telefone: string, texto: string) => `https://wa.me/55${telefone}?text=${encodeURIComponent(texto)}`;

const FUSO = { timeZone: 'America/Sao_Paulo' } as const;
export const formatarData = (d: Date | string) => new Date(d).toLocaleDateString('pt-BR', FUSO);
export const formatarHora = (d: Date | string) => new Date(d).toLocaleString('pt-BR', { ...FUSO, day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
