// Regras do padrão GR Brands 2. Rodam no navegador (ao digitar e ao colar) e
// de novo no servidor, porque o navegador nunca é confiável.

export function sanitizarNome(valor: string): string {
  return valor.normalize('NFC').replace(/[^\p{L}\p{M} '’-]/gu, '').replace(/ {2,}/g, ' ');
}

export function validarNome(valor: string): string | null {
  const limpo = valor.trim();
  if (!limpo) return 'Informe o seu nome.';
  if (sanitizarNome(limpo) !== limpo) return 'Use só letras, espaços, apóstrofo e hífen.';
  if ((limpo.match(/\p{L}/gu) ?? []).length < 2) return 'Nome muito curto.';
  return null;
}

export function normalizarTelefone(valor: string): string {
  const comPais = /^\s*\+\s*55/.test(valor);
  let digitos = valor.replace(/\D/g, '');
  // O DDD 55 existe. Só é código de país com "+55" ou com dígitos a mais para
  // um telefone brasileiro (12 ou 13: 55 + DDD + número).
  if (digitos.startsWith('55') && (comPais || digitos.length >= 12)) digitos = digitos.slice(2);
  return digitos.slice(0, 11);
}

export function formatarTelefone(digitos: string): string {
  const d = digitos.replace(/\D/g, '').slice(0, 11);
  if (!d) return '';
  if (d.length <= 2) return `(${d}`;
  const ddd = d.slice(0, 2);
  const resto = d.slice(2);
  const corte = resto.length === 9 ? 5 : 4;
  if (resto.length <= corte) return `(${ddd}) ${resto}`;
  return `(${ddd}) ${resto.slice(0, corte)}-${resto.slice(corte)}`;
}

export function telefoneValido(digitos: string): boolean {
  if (/^[1-9][1-9]9\d{8}$/.test(digitos)) return true; // celular
  return /^[1-9][1-9][2-5]\d{7}$/.test(digitos); // fixo
}

export function validarTelefone(valor: string): string | null {
  const d = normalizarTelefone(valor);
  if (!d) return 'Informe o seu WhatsApp com DDD.';
  return telefoneValido(d) ? null : 'Telefone incompleto ou inválido.';
}

export function validarEmail(valor: string): string | null {
  const limpo = valor.trim();
  if (!limpo) return 'Informe o seu e-mail.';
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(limpo) ? null : 'E-mail inválido.';
}

export const REGRAS_SENHA = [
  { rotulo: 'Pelo menos 8 caracteres', ok: (s: string) => s.length >= 8 },
  { rotulo: 'Uma letra', ok: (s: string) => /\p{L}/u.test(s) },
  { rotulo: 'Um número', ok: (s: string) => /\d/.test(s) },
] as const;

export function validarSenha(valor: string): string | null {
  if (!valor) return 'Crie uma senha.';
  const falta = REGRAS_SENHA.find((r) => !r.ok(valor));
  return falta ? `Falta: ${falta.rotulo.toLowerCase()}.` : null;
}

export type Erros = Record<string, string>;

export function semVazios(candidatos: Record<string, string | null | undefined>): Erros {
  return Object.fromEntries(Object.entries(candidatos).filter(([, v]) => v)) as Erros;
}
