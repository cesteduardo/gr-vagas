import { describe, expect, it } from 'vitest';
import { cruzar, ordenarPorCombinacao, radical } from './combinar';

const vaga = (titulo: string, area: string, requisitos = '', descricao = '') => ({ titulo, area, requisitos, descricao });

describe('radical', () => {
  it('junta palavras da mesma família', () => {
    expect(radical('cozinheiro')).toBe(radical('cozinha'));
    expect(radical('atendente')).toBe(radical('atendimento'));
    expect(radical('recepcionista')).toBe(radical('recepcao'));
    expect(radical('vendedor')).toBe(radical('vendas'));
    expect(radical('estoquista')).toBe(radical('estoque'));
  });
  it('não junta pedaços de palavra', () => {
    expect(radical('estagiario')).not.toBe(radical('rio'));
  });
});

describe('cruzar perfil e vaga', () => {
  it('cozinheiro combina com auxiliar de cozinha', () => {
    const c = cruzar({ titulo: 'Cozinheiro', resumo: '' }, vaga('Auxiliar de cozinha', 'Restaurantes e alimentação'))!;
    expect(c.combina).toBe(true);
    expect(c.emComum).toContain('cozinha');
  });
  it('só a palavra de nível não faz combinar', () => {
    const c = cruzar({ titulo: 'Auxiliar administrativo', resumo: '' }, vaga('Auxiliar de cozinha', 'Restaurantes e alimentação'))!;
    expect(c.combina).toBe(false);
  });
  it('cidade sozinha não faz combinar', () => {
    const c = cruzar({ titulo: 'Soldador', resumo: 'Moro em Rio Preto', cidadeSlug: 'sao-jose-do-rio-preto' }, { ...vaga('Recepcionista', 'Saúde'), cidadeSlug: 'sao-jose-do-rio-preto' })!;
    expect(c.combina).toBe(false);
  });
  it('usa os cargos que a pessoa já teve', () => {
    const c = cruzar({ titulo: '', resumo: '', cv: { experiencias: [{ cargo: 'Estoquista', empresa: 'Mercado', inicio: '2020', fim: '', atual: true, descricao: '' }] } }, vaga('Auxiliar de estoque', 'Logística'))!;
    expect(c.combina).toBe(true);
  });
  it('habilidades que batem com o pedido também contam', () => {
    const c = cruzar({ titulo: '', resumo: '', cv: { habilidades: ['Excel', 'Planilhas', 'Notas fiscais', 'Faturamento'] } }, vaga('Assistente', 'Escritório', 'Excel avançado, planilhas, emissão de notas fiscais e faturamento'))!;
    expect(c.combina).toBe(true);
  });
  it('perfil vazio não cruza', () => {
    expect(cruzar({ titulo: '', resumo: '' }, vaga('Recepcionista', 'Saúde'))).toBeNull();
  });
  it('a porcentagem pesa o cargo', () => {
    const v = vaga('Recepcionista', 'Saúde', 'Atendimento ao público');
    expect(cruzar({ titulo: 'Recepcionista', resumo: 'Atendimento em clínicas' }, v)!.porcentagem).toBeGreaterThanOrEqual(70);
    expect(cruzar({ titulo: 'Soldador', resumo: 'Indústria' }, v)!.porcentagem).toBe(0);
  });
});

describe('ordenar por combinação', () => {
  it('deixa de fora o que não combina e põe o mais parecido primeiro', () => {
    const lista = [vaga('Recepcionista', 'Saúde'), vaga('Atendente de loja', 'Comércio e varejo', 'Atendimento ao cliente e vendas'), vaga('Vendedor externo', 'Comércio e varejo', 'Vendas')];
    const r = ordenarPorCombinacao({ titulo: 'Vendedora', resumo: 'Vendas e atendimento em loja de roupas' }, lista, 5);
    expect(r.map((v) => v.titulo)).toEqual(['Vendedor externo', 'Atendente de loja']);
  });
});
