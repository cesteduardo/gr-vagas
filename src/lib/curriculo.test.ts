import { describe, expect, it } from 'vitest';
import { cvDoTexto, cvValido, periodo } from './curriculo';

// Mesmo formato de um currículo real, com dados fictícios.
const TEXTO = `MARIA EXEMPLO DA SILVA
1.Dados pessoais
Estado Civil: Casado
Nascimento: 20/07/2000
Endereço: Rua Exemplo n°100 Centro
São José do Rio Preto - SP
Telefone: (17) 99123-4567
E-mail: maria@exemplo.com
Portfólio: exemplo.com.br/portfolio
2.Idiomas
Inglês intermediário
Espanhol básico
3.Formação Acadêmica
2025 - UX Design - Escola Exemplo
2018 – 2019 - Técnico em informática pelo SENAC SP: Manutenção e montagem de computadores,
atendimento ao consumidor final.
2017 – Ensino Médio completo “E.E. Exemplo”.
4.Experiência Profissional
2025 - Atualmente - Desenvolvedora Web e Designer em Agência Exemplo
Desenvolvimento de landing pages responsivas com foco em conversão.
Estruturação de formulários e automações.
2024 - Designer Jr. em Loja Exemplo
Criação de peças promocionais.`;

describe('ler currículo no formato comum', () => {
  const cv = cvDoTexto(TEXTO);
  it('dados pessoais', () => {
    expect(cv).toMatchObject({ estadoCivil: 'Casado(a)', nascimento: '2000-07-20', endereco: 'Rua Exemplo n°100 Centro', portfolio: 'exemplo.com.br/portfolio', telefone: '17991234567', email: 'maria@exemplo.com' });
  });
  it('idiomas com nível', () => {
    expect(cv.idiomas).toEqual([{ lingua: 'Inglês', nivel: 'Intermediário' }, { lingua: 'Espanhol', nivel: 'Básico' }]);
  });
  it('formação com período, curso, instituição e descrição', () => {
    expect(cv.formacao![0]).toMatchObject({ inicio: '2025', curso: 'UX Design', instituicao: 'Escola Exemplo' });
    expect(cv.formacao![1]).toMatchObject({ inicio: '2018', fim: '2019', curso: 'Técnico em informática pelo SENAC SP' });
    expect(cv.formacao![1]!.descricao).toContain('atendimento ao consumidor');
    expect(cv.formacao).toHaveLength(3);
  });
  it('experiência atual e anterior, separando cargo e empresa', () => {
    expect(cv.experiencias![0]).toMatchObject({ inicio: '2025', atual: true, cargo: 'Desenvolvedora Web e Designer', empresa: 'Agência Exemplo' });
    expect(cv.experiencias![0]!.descricao).toContain('Estruturação de formulários');
    expect(cv.experiencias![1]).toMatchObject({ inicio: '2024', atual: false, cargo: 'Designer Jr.', empresa: 'Loja Exemplo', descricao: 'Criação de peças promocionais.' });
  });
});

describe('validação', () => {
  it('descarta lixo e limita tamanhos', () => {
    const v = cvValido({ estadoCivil: 'Pirata', nascimento: '20/07/2000', portfolio: 'javascript:alert(1)', idiomas: [{ lingua: 'Inglês', nivel: 'Mestre' }, { lingua: '' }, 3], formacao: [{ curso: 'x'.repeat(500), inicio: '20a5' }], experiencias: Array.from({ length: 30 }, () => ({ cargo: 'Caixa', atual: true, fim: '2020' })) });
    expect(v.estadoCivil).toBe('');
    expect(v.nascimento).toBe('');
    expect(v.portfolio).not.toMatch(/javascript/i);
    expect(v.idiomas).toEqual([{ lingua: 'Inglês', nivel: 'Básico' }]);
    expect(v.formacao![0]!.curso).toHaveLength(120);
    expect(v.formacao![0]!.inicio).toBe('');
    expect(v.experiencias).toHaveLength(20);
    expect(v.experiencias![0]!.fim).toBe('');
    expect(cvValido(null)).toMatchObject({ idiomas: [], formacao: [], experiencias: [] });
  });
  it('período escrito como no currículo', () => {
    expect(periodo('2025', '', true)).toBe('2025 - Atualmente');
    expect(periodo('2018', '2019')).toBe('2018 - 2019');
    expect(periodo('2017', '2017')).toBe('2017');
  });
});

describe('chave de tela não vai para o banco', () => {
  it('cvValido descarta o _k que o editor põe em cada item', () => {
    const cv = cvValido({ idiomas: [{ lingua: 'Inglês', nivel: 'Básico', _k: 'i1' }], experiencias: [{ cargo: 'Atendente', inicio: '2020', fim: '', atual: true, empresa: '', descricao: '', _k: 'i2' }], formacao: [{ curso: 'Técnico', inicio: '', fim: '', instituicao: '', descricao: '', _k: 'i3' }] });
    expect(JSON.stringify(cv)).not.toContain('_k');
  });
});
