import { describe, expect, it, vi } from 'vitest';
import { lerCurriculo, lerDoTexto, limpar } from './curriculo';
import { lerVaga, vagaDoTexto } from './vaga';

const CV = `Maria Aparecida da Silva
Recepcionista
maria.silva@email.com | (17) 99888-7777
São José do Rio Preto - SP

Resumo profissional
Cinco anos de experiência em recepção de clínicas e atendimento ao público.

Formação
Ensino médio completo`;

describe('currículo sem IA', () => {
  it('acha nome, contato, ocupação, cidade e resumo', () => {
    expect(lerDoTexto(CV)).toEqual({ nome: 'Maria Aparecida da Silva', email: 'maria.silva@email.com', telefone: '17998887777', titulo: 'Recepcionista', cidadeSlug: 'sao-jose-do-rio-preto', resumo: expect.stringContaining('Cinco anos') });
  });
  it('telefone com país e título "Currículo" no topo', () => {
    const r = lerDoTexto('CURRÍCULO\nJoão Pereira\nObjetivo: Motorista\n+55 17 99777-6666\njoao@teste.com.br');
    expect(r).toMatchObject({ nome: 'João Pereira', titulo: 'Motorista', telefone: '17997776666', email: 'joao@teste.com.br' });
  });
  it('números dentro do e-mail não viram telefone', () => {
    expect(lerDoTexto('Ana Lima\nana17993664693@teste.com\n(17) 99123-4567').telefone).toBe('17991234567');
    expect(lerDoTexto('Ana Lima\nana17993664693@teste.com').telefone).toBe('');
  });
  it('texto vazio devolve tudo vazio, sem quebrar', () => {
    expect(lerDoTexto('')).toEqual({ nome: '', email: '', telefone: '', titulo: '', resumo: '', cidadeSlug: '' });
  });
  it('PDF ilegível não derruba a leitura', async () => {
    const r = await lerCurriculo(Buffer.from('%PDF-1.4 quebrado'), null);
    expect(r.porIa).toBe(false);
    expect(r.dados.nome).toBe('');
  });
});

describe('currículo com IA', () => {
  it('resposta da IA passa pelas regras dos formulários', async () => {
    const ia = vi.fn(async () => ({ nome: 'Ana123 <script>', email: 'nao-e-email', telefone: '+55 17 99888-7777', titulo: 'Caixa', resumo: 'Experiência', cidade: 'Mirassol' }));
    const r = await lerCurriculo(Buffer.from('%PDF-1.4'), ia);
    expect(r.porIa).toBe(true);
    expect(r.dados).toMatchObject({ email: '', telefone: '17998887777', titulo: 'Caixa', cidadeSlug: 'mirassol' });
    expect(r.dados.nome).not.toMatch(/[<>\d]/);
    expect(ia.mock.calls[0]).toBeDefined();
  });
  it('se a IA falhar, usa as regras locais', async () => {
    const r = await lerCurriculo(Buffer.from('%PDF-1.4'), async () => null);
    expect(r.porIa).toBe(false);
  });
  it('limpar ignora tipos errados', () => {
    expect(limpar({ nome: 123, email: {}, telefone: [], titulo: null })).toMatchObject({ nome: '', email: '', telefone: '', titulo: '' });
  });
});

describe('vaga colada', () => {
  const TEXTO = `Vaga: Auxiliar de Cozinha
Restaurante em São José do Rio Preto, contrato CLT, presencial.
Salário R$ 1.900,00

Atividades:
- Preparar alimentos
- Organizar a cozinha

Requisitos:
- Experiência em cozinha

Benefícios:
- Vale-transporte
- Refeição no local

Interessados chamar no WhatsApp`;
  it('organiza um texto de grupo de WhatsApp', () => {
    expect(vagaDoTexto(TEXTO)).toMatchObject({ titulo: 'Auxiliar de Cozinha', contrato: 'CLT', modalidade: 'Presencial', cidade: 'sao-jose-do-rio-preto', salario: '1.900,00', descricao: 'Preparar alimentos\nOrganizar a cozinha', requisitos: 'Experiência em cozinha', beneficios: 'Vale-transporte\nRefeição no local' });
  });
  it('IA só devolve opções válidas', async () => {
    const r = await lerVaga('x', async () => ({ titulo: 'Caixa', area: 'Inventada', contrato: 'CLT', modalidade: 'Marte', cidade: 'Paris', salario: 'muito', descricao: 'd', requisitos: 'r', beneficios: 'b' }));
    expect(r).toMatchObject({ titulo: 'Caixa', area: '', contrato: 'CLT', modalidade: '', cidade: '', salario: '' });
  });
});
