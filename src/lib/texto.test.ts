import { describe, expect, it } from 'vitest';
import { revisarTexto } from './moderacao';
import { formatarSalario, lerSalario, paraSlug } from './texto';

describe('texto', () => {
  it('slug sem acento', () => expect(paraSlug('Técnico de Enfermagem!')).toBe('tecnico-de-enfermagem'));
  it.each([['2.500,00', 250000], ['2500', 250000], ['R$ 1.800,5', 180050], ['', null]])('salário %s', (a, b) => expect(lerSalario(a)).toBe(b));
  it('formata', () => {
    expect(formatarSalario(null)).toBe('A combinar');
    expect(formatarSalario(250000).replace(/\s/g, ' ')).toBe('R$ 2.500,00');
  });
});

describe('moderação', () => {
  it.each(['Pagar taxa de inscrição de R$ 50', 'Necessário comprar kit de trabalho', 'Curso obrigatório pago', 'Ganhos garantidos toda semana'])('barra golpe: %s', (t) => {
    expect(revisarTexto(t)?.motivo).toBe('golpe');
  });
  it.each(['Exigimos boa aparência', 'Sexo masculino', 'Somente mulheres', 'Solteira e sem filhos', 'Idade máxima 35', 'Até 35 anos'])('barra discriminação: %s', (t) => {
    expect(revisarTexto(t)?.motivo).toBe('discriminacao');
  });
  it.each(['De 2 a 5 anos de experiência', 'Salário pago por Pix', 'Até 10 anos de experiência', 'Oferecemos curso de capacitação gratuito', 'Vale-transporte e taxa de entrega paga pela empresa'])('não barra: %s', (t) => {
    expect(revisarTexto(t)).toBeNull();
  });
});
