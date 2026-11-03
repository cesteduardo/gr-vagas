import { describe, expect, it } from 'vitest';
import { formatarTelefone, normalizarTelefone, sanitizarNome, validarEmail, validarNome, validarTelefone } from './validators';

describe('padrão 2', () => {
  it.each([['Eduardo123 Gonçalves', 'Eduardo Gonçalves'], ['123Eduardo', 'Eduardo'], ['Edu@rdo', 'Edurdo'], ['João da Silva', 'João da Silva'], ["Maria-Clara D'Ávila", "Maria-Clara D'Ávila"]])('nome %s', (a, b) => {
    expect(sanitizarNome(a)).toBe(b);
  });
  it.each([
    ['17999999999', '17999999999'],
    ['(17) 99999-9999', '17999999999'],
    ['abc17999999999', '17999999999'],
    ['+55 17 99999-9999', '17999999999'],
    ['5517999999999', '17999999999'],
    ['55999999999', '55999999999'],
    ['1732323232', '1732323232'],
  ])('telefone %s', (a, b) => {
    expect(normalizarTelefone(a)).toBe(b);
  });
  it('máscara e validação', () => {
    expect(formatarTelefone('17999999999')).toBe('(17) 99999-9999');
    expect(formatarTelefone('1732323232')).toBe('(17) 3232-3232');
    expect(validarTelefone('1799999')).toBeTruthy();
    expect(validarTelefone('55999999999')).toBeNull();
    expect(validarNome('')).toBeTruthy();
    expect(validarEmail('a@b')).toBeTruthy();
    expect(validarEmail('a@b.com')).toBeNull();
  });
});
