import { AREAS, cidadePorSlug, CONTRATOS, MODALIDADES } from '@/lib/config';
import { revisarTexto } from '@/lib/moderacao';
import { lerSalario } from '@/lib/texto';
import { tagsValidas } from '@/lib/tags';
import { normalizarTelefone, semVazios, validarEmail, validarNome, validarTelefone, type Erros } from './validators';

export type CamposVaga = { titulo: string; area: string; contrato: string; modalidade: string; cidade: string; salarioTipo: string; salario: string; descricao: string; requisitos: string; beneficios: string; tags?: string[] };
export type DadosVaga = { titulo: string; area: string; contrato: string; modalidade: string; cidadeSlug: string; salarioCentavos: number | null; descricao: string; requisitos: string; beneficios: string; tags?: string[] };

const tamanho = (v: string, min: number, max: number, rotulo: string) => {
  const t = v.trim();
  if (!t) return `Informe ${rotulo}.`;
  if (t.length < min) return `Escreva pelo menos ${min} caracteres.`;
  if (t.length > max) return `Use no máximo ${max} caracteres.`;
  return null;
};

export function errosVaga(c: CamposVaga): Erros {
  const salarioCentavos = lerSalario(c.salario);
  return semVazios({
    titulo: tamanho(c.titulo, 3, 80, 'o cargo') ?? revisarTexto(c.titulo)?.mensagem,
    area: (AREAS as readonly string[]).includes(c.area) ? null : 'Escolha a área.',
    contrato: (CONTRATOS as readonly string[]).includes(c.contrato) ? null : 'Escolha o tipo de contrato.',
    modalidade: (MODALIDADES as readonly string[]).includes(c.modalidade) ? null : 'Escolha a modalidade.',
    cidade: cidadePorSlug(c.cidade) ? null : 'Escolha a cidade.',
    salarioTipo: c.salarioTipo === 'valor' || c.salarioTipo === 'combinar' ? null : 'Diga como é o salário.',
    salario: c.salarioTipo === 'valor' && (!salarioCentavos || salarioCentavos < 100 || salarioCentavos > 100_000_000) ? 'Informe o valor do salário.' : null,
    descricao: tamanho(c.descricao, 30, 4000, 'o que a pessoa vai fazer') ?? revisarTexto(c.descricao)?.mensagem,
    requisitos: tamanho(c.requisitos, 3, 2000, 'os requisitos') ?? revisarTexto(c.requisitos)?.mensagem,
    beneficios: tamanho(c.beneficios, 3, 2000, 'os benefícios') ?? revisarTexto(c.beneficios)?.mensagem,
  });
}

export function validarVaga(c: CamposVaga): { dados: DadosVaga | null; erros: Erros } {
  const erros = errosVaga(c);
  if (Object.keys(erros).length) return { dados: null, erros };
  return {
    dados: {
      titulo: c.titulo.trim(),
      area: c.area,
      contrato: c.contrato,
      modalidade: c.modalidade,
      cidadeSlug: c.cidade,
      salarioCentavos: c.salarioTipo === 'valor' ? lerSalario(c.salario) : null,
      descricao: c.descricao.trim(),
      requisitos: c.requisitos.trim(),
      beneficios: c.beneficios.trim(),
      tags: tagsValidas(c.tags ?? []),
    },
    erros: {},
  };
}

export type CamposPessoa = { nome: string; email: string; telefone: string };

export function errosPessoa(c: CamposPessoa): Erros {
  return semVazios({ nome: validarNome(c.nome), email: validarEmail(c.email), telefone: validarTelefone(c.telefone) });
}

export const pessoaNormalizada = (c: CamposPessoa) => ({ nome: c.nome.trim(), email: c.email.trim().toLowerCase(), telefone: normalizarTelefone(c.telefone) });

export function errosEmpresa(nome: string): string | null {
  const t = nome.trim();
  if (!t) return 'Informe o nome da empresa.';
  if (t.length < 2) return 'Nome muito curto.';
  return t.length > 80 ? 'Use no máximo 80 caracteres.' : null;
}
