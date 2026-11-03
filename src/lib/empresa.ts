import { cidadePorSlug } from '@/lib/config';
import { normalizarTelefone, telefoneValido } from '@/lib/forms/validators';
import { revisarTexto } from '@/lib/moderacao';

export const TAMANHOS = ['', 'Só eu', '2 a 10 pessoas', '11 a 50 pessoas', '51 a 200 pessoas', 'Mais de 200 pessoas'] as const;
export type PerfilEmpresa = { razaoSocial?: string; cnpj?: string; setor?: string; tamanho?: string; fundacao?: string; porQue?: string; cidadeSlug?: string; endereco?: string; site?: string; instagram?: string; whatsapp?: string };

// Confere os dígitos do CNPJ. Não confirma que a empresa existe, só que o número é possível.
export function cnpjValido(bruto: string): boolean {
  const n = bruto.replace(/\D/g, '');
  if (n.length !== 14 || /^(\d)\1+$/.test(n)) return false;
  const digito = (base: string, pesos: number[]) => {
    const soma = base.split('').reduce((t, c, i) => t + Number(c) * pesos[i]!, 0);
    const r = soma % 11;
    return r < 2 ? 0 : 11 - r;
  };
  const p1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const d1 = digito(n.slice(0, 12), p1);
  const d2 = digito(n.slice(0, 12) + d1, [6, ...p1]);
  return n.endsWith(`${d1}${d2}`);
}

export const formatarCnpj = (n: string) => n.replace(/\D/g, '').slice(0, 14).replace(/^(\d{2})(\d)/, '$1.$2').replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3').replace(/\.(\d{3})(\d)/, '.$1/$2').replace(/(\d{4})(\d)/, '$1-$2');

const txt = (v: unknown, max: number) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max) : '');

export function validarPerfilEmpresa(p: unknown): { perfil: PerfilEmpresa; erros: Record<string, string> } {
  const o = (p && typeof p === 'object' ? p : {}) as Record<string, unknown>;
  const erros: Record<string, string> = {};
  const cnpj = String(o.cnpj ?? '').replace(/\D/g, '');
  if (cnpj && !cnpjValido(cnpj)) erros.cnpj = 'CNPJ inválido. Confira os números.';
  const whatsapp = normalizarTelefone(String(o.whatsapp ?? ''));
  if (whatsapp && !telefoneValido(whatsapp)) erros.whatsapp = 'Informe o WhatsApp com DDD.';
  const site = txt(o.site, 120).replace(/^javascript:/i, '');
  const instagram = txt(o.instagram, 40).replace(/^@/, '').replace(/[^\w.]/g, '');
  const porQue = typeof o.porQue === 'string' ? o.porQue.trim().slice(0, 1200) : '';
  if (porQue && revisarTexto(porQue)) erros.porQue = revisarTexto(porQue)!.mensagem;
  const fundacao = /^\d{4}$/.test(String(o.fundacao ?? '')) && Number(o.fundacao) <= new Date().getFullYear() ? String(o.fundacao) : '';
  return {
    perfil: {
      razaoSocial: txt(o.razaoSocial, 120),
      cnpj: erros.cnpj ? '' : cnpj,
      setor: txt(o.setor, 60),
      tamanho: (TAMANHOS as readonly string[]).includes(String(o.tamanho ?? '')) ? String(o.tamanho ?? '') : '',
      fundacao,
      porQue: erros.porQue ? '' : porQue,
      cidadeSlug: cidadePorSlug(String(o.cidadeSlug ?? ''))?.slug ?? '',
      endereco: txt(o.endereco, 160),
      site,
      instagram,
      whatsapp: erros.whatsapp ? '' : whatsapp,
    },
    erros,
  };
}

export const linkSite = (site: string) => (/^https?:\/\//i.test(site) ? site : `https://${site}`);
