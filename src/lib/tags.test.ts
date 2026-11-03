import { describe, expect, it } from 'vitest';
import { beneficiosDoTexto, etiquetasDaVaga, nomeDaTag, tagsDoTexto, tagsValidas } from './tags';

describe('etiquetas da vaga', () => {
  it('aceita só etiquetas da lista, sem repetir e no máximo seis', () => {
    expect(tagsValidas(['sem-experiencia', 'inventada', 'sem-experiencia', 'escala-12x36'])).toEqual(['sem-experiencia', 'escala-12x36']);
    expect(tagsValidas('sem-experiencia')).toEqual([]);
    expect(tagsValidas(['sem-experiencia', 'primeiro-emprego', 'inicio-imediato', 'meio-periodo', 'escala-12x36', 'turno-noite', 'pcd'])).toHaveLength(6);
  });

  it('acha no texto colado o que está escrito', () => {
    expect(tagsDoTexto('Não exige experiência. Início imediato! Escala 12x36, período noturno.')).toEqual(['sem-experiencia', 'inicio-imediato', 'escala-12x36', 'turno-noite']);
    expect(tagsDoTexto('Vaga para primeiro emprego, de segunda a sexta')).toEqual(['primeiro-emprego', 'fins-de-semana-livres']);
    expect(tagsDoTexto('Vaga também para PcD. Aceitamos pessoas acima de 50 anos.')).toEqual(['pcd', 'mais-50']);
    expect(tagsDoTexto('Meio período, 4 horas')).toEqual(['meio-periodo']);
  });

  it('não marca o que não está escrito', () => {
    expect(tagsDoTexto('Experiência de 2 anos em vendas. Sábados alternados.')).toEqual([]);
    expect(tagsDoTexto('Experiência mínima de 6 meses')).toEqual([]);
  });

  it('benefícios saem só do texto de benefícios', () => {
    expect(beneficiosDoTexto('VT, VR e plano de saúde\nCesta básica\nComissão por venda')).toEqual(['Vale-transporte', 'Vale-refeição', 'Cesta básica', 'Plano de saúde', 'Comissão']);
    expect(beneficiosDoTexto('Vale-alimentação, convênio odontológico, Gympass')).toEqual(['Vale-alimentação', 'Plano odontológico', 'Academia']);
    expect(beneficiosDoTexto('A combinar')).toEqual([]);
  });

  it('junta etiquetas marcadas e benefícios escritos', () => {
    expect(etiquetasDaVaga({ tags: ['inicio-imediato'], beneficios: 'Vale-transporte' })).toEqual({ tags: ['Início imediato'], beneficios: ['Vale-transporte'] });
    expect(etiquetasDaVaga({ tags: null, beneficios: '' })).toEqual({ tags: [], beneficios: [] });
    expect(nomeDaTag('pcd')).toBe('Também para PcD');
    expect(nomeDaTag('nada')).toBeNull();
  });
});
