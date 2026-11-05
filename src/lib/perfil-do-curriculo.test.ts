import { beforeAll, describe, expect, it } from 'vitest';
import type { Banco } from '@/lib/db/client';
import { VAZIO } from '@/lib/ia/curriculo';
import { cvDoTexto } from '@/lib/curriculo';
import { criarConta } from '@/lib/auth/contas';
import { bancoEmMemoria, umaEmpresa } from '@/lib/teste-apoio';
import { vagasQueCombinam } from '@/lib/vagas';
import { perfilDe, salvarPerfil } from './perfis';
import { aplicarCurriculo, habilidadesDoTexto, perfilComCurriculo } from './perfil-do-curriculo';

// Currículo fictício no formato comum, sem seção de habilidades marcada em todas as linhas.
const TEXTO = `JOANA EXEMPLO
Objetivo
Técnica de enfermagem
Formação Acadêmica
2019 – 2020 - Técnico em Enfermagem - Escola Exemplo
Experiência Profissional
2021 - Atualmente - Técnica de enfermagem em Clínica Exemplo
Atendimento ao paciente, curativos e primeiros socorros.
Habilidades
Pacote Office, Organização
Cursos
2022 - NR 32 - Senac
CNH categoria B`;

const vazio = { titulo: '', cidadeSlug: '', resumo: '', cv: {} };

describe('habilidades soltas no texto', () => {
  it('acha as comuns sem seção própria', () => {
    const h = habilidadesDoTexto('Excel avançado, operador de caixa. NR-35 e NR 10. Possuo CNH categoria AB.');
    expect(h).toEqual(expect.arrayContaining(['Excel', 'Operação de caixa', 'NR-35', 'NR-10', 'CNH AB']));
  });
  it('não inventa', () => {
    expect(habilidadesDoTexto('Gosto de ler e de caminhar no parque.')).toEqual([]);
  });
});

describe('perfil a partir do currículo', () => {
  it('perfil vazio ganha cargo, experiência, formação e habilidades', () => {
    const { perfil, acrescimos } = perfilComCurriculo(vazio, cvDoTexto(TEXTO), VAZIO, TEXTO);
    expect(perfil.titulo).toBe('Técnica de enfermagem');
    expect(perfil.cv.experiencias?.[0]?.cargo).toBe('Técnica de enfermagem');
    expect(perfil.cv.formacao?.length).toBeGreaterThan(0);
    expect(perfil.cv.habilidades).toEqual(expect.arrayContaining(['Pacote Office', 'Organização', 'Primeiros socorros', 'Enfermagem', 'NR-32', 'CNH B']));
    expect(acrescimos.titulo).toBe('Técnica de enfermagem');
    expect(acrescimos.cv.habilidades).toEqual(perfil.cv.habilidades);
  });

  it('não apaga nem repete o que a pessoa já escreveu', () => {
    const atual = {
      titulo: 'Enfermeira',
      cidadeSlug: 'mirassol',
      resumo: 'Meu texto.',
      cv: { habilidades: ['pacote office', 'Paciência'], experiencias: [{ inicio: '2021', fim: '', atual: true, cargo: 'Técnica de enfermagem', empresa: 'Clínica Exemplo', descricao: 'Escrito por mim.' }] },
    };
    const { perfil, acrescimos } = perfilComCurriculo(atual, cvDoTexto(TEXTO), { ...VAZIO, titulo: 'Outro', resumo: 'Outro', cidadeSlug: 'sao-jose-do-rio-preto' }, TEXTO);
    expect(perfil.titulo).toBe('Enfermeira');
    expect(perfil.cidadeSlug).toBe('mirassol');
    expect(perfil.resumo).toBe('Meu texto.');
    expect(acrescimos.titulo).toBeUndefined();
    expect(perfil.cv.experiencias).toHaveLength(1);
    expect(perfil.cv.experiencias?.[0]?.descricao).toBe('Escrito por mim.');
    expect(perfil.cv.habilidades?.slice(0, 2)).toEqual(['pacote office', 'Paciência']);
    expect(perfil.cv.habilidades?.filter((h) => h.toLowerCase() === 'pacote office')).toHaveLength(1);
    expect(acrescimos.cv.experiencias).toBeUndefined();
  });

  it('para em 20 habilidades', () => {
    const atual = { ...vazio, cv: { habilidades: Array.from({ length: 19 }, (_, i) => `Coisa ${i}`) } };
    const { perfil, acrescimos } = perfilComCurriculo(atual, cvDoTexto(TEXTO), VAZIO, TEXTO);
    expect(perfil.cv.habilidades).toHaveLength(20);
    expect(acrescimos.cv.habilidades).toHaveLength(1);
  });
});

// PDF de verdade, com texto, como o que a pessoa envia.
function pdf(linhas: string[]) {
  const esc = (t: string) => t.replace(/[\\()]/g, '\\$&');
  const conteudo = `BT /F1 12 Tf 72 760 Td 16 TL ${linhas.map((l) => `(${esc(l)}) Tj T*`).join(' ')} ET`;
  const objetos = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
    `<< /Length ${Buffer.byteLength(conteudo, 'latin1')} >>\nstream\n${conteudo}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
  ];
  let corpo = '%PDF-1.4\n';
  const pos: number[] = [];
  objetos.forEach((o, i) => {
    pos.push(Buffer.byteLength(corpo, 'latin1'));
    corpo += `${i + 1} 0 obj\n${o}\nendobj\n`;
  });
  const xref = Buffer.byteLength(corpo, 'latin1');
  corpo += `xref\n0 ${objetos.length + 1}\n0000000000 65535 f \n${pos.map((p) => `${String(p).padStart(10, '0')} 00000 n \n`).join('')}trailer\n<< /Size ${objetos.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(corpo, 'latin1');
}

describe('enviar o currículo atualiza o perfil gravado', () => {
  let db: Banco;
  beforeAll(async () => {
    db = await bancoEmMemoria();
  });

  it('grava as tags e a vaga passa a combinar', async () => {
    await umaEmpresa(db, { titulo: 'Técnico de Enfermagem', area: 'Saúde' });
    const c = await criarConta(db, { tipo: 'candidato', nome: 'Joana Exemplo', email: 'joana@exemplo.com', telefone: '17988887777', senha: 'segredo123' });
    const id = c.usuarioId!;
    await salvarPerfil(db, id, { titulo: '', cidadeSlug: 'sao-jose-do-rio-preto', resumo: '', aceiteTalentos: false });
    const antes = await perfilDe(db, id);
    expect(await vagasQueCombinam(db, { titulo: antes.titulo, texto: antes.resumo, cidadeSlug: antes.cidadeSlug, cv: antes.cv })).toHaveLength(0);

    await aplicarCurriculo(db, id, pdf(TEXTO.split('\n')));
    const p = await perfilDe(db, id);
    expect(p.titulo).toBe('Técnica de enfermagem');
    expect(p.cidadeSlug).toBe('sao-jose-do-rio-preto');
    expect(p.cv.habilidades).toEqual(expect.arrayContaining(['Pacote Office', 'Primeiros socorros']));
    const combinam = await vagasQueCombinam(db, { titulo: p.titulo, texto: p.resumo, cidadeSlug: p.cidadeSlug, cv: p.cv });
    expect(combinam.map((v) => v.titulo)).toContain('Técnico de Enfermagem');
  });
});
