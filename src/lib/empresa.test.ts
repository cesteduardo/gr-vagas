import { describe, expect, it } from 'vitest';
import { cnpjValido, formatarCnpj, validarPerfilEmpresa } from './empresa';

describe('perfil da empresa', () => {
  it('confere os dígitos do CNPJ', () => {
    expect(cnpjValido('11.222.333/0001-81')).toBe(true);
    expect(cnpjValido('11.222.333/0001-82')).toBe(false);
    expect(cnpjValido('11111111111111')).toBe(false);
    expect(formatarCnpj('11222333000181')).toBe('11.222.333/0001-81');
  });
  it('valida e limpa os campos', () => {
    const { perfil, erros } = validarPerfilEmpresa({ cnpj: '123', whatsapp: '179', instagram: '@loja.exemplo!', site: 'javascript:alert(1)', tamanho: 'Gigante', fundacao: '3000', cidadeSlug: 'mirassol', porQue: 'Exigimos boa aparência' });
    expect(erros).toMatchObject({ cnpj: expect.any(String), whatsapp: expect.any(String), porQue: expect.any(String) });
    expect(perfil).toMatchObject({ cnpj: '', instagram: 'loja.exemplo', tamanho: '', fundacao: '', cidadeSlug: 'mirassol', porQue: '' });
    expect(perfil.site).not.toMatch(/javascript/i);
    expect(validarPerfilEmpresa({ cnpj: '11.222.333/0001-81', whatsapp: '(17) 99999-0001' }).perfil).toMatchObject({ cnpj: '11222333000181', whatsapp: '17999990001' });
  });
});
