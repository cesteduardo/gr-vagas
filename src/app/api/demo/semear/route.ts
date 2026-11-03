import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { SIMULADOR } from '@/lib/config';
import { banco } from '@/lib/db/client';
import { usuarios } from '@/lib/db/schema';
import { candidatarSemConta, enviarMensagem } from '@/lib/candidaturas';
import { criarConta } from '@/lib/auth/contas';
import { hashSenha } from '@/lib/auth/senha';
import { empresas } from '@/lib/db/schema';
import { alternarSalva, criarAlerta, guardarCurriculo, salvarPerfil } from '@/lib/perfis';
import { aplicarEvento } from '@/lib/planos';
import { mudarEtapa } from '@/lib/candidaturas';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { guardarImagemVaga, publicarSemConta, publicarVaga, salvarArte } from '@/lib/vagas';

// Contas de teste, só no modo de demonstração.
export const CONTAS_TESTE = { empresa: 'empresa@teste.com', candidato: 'candidato@teste.com', senha: 'teste1234' };

const EXEMPLOS = [
  ['Auxiliar administrativo', 'Administrativo', 'Escritório Modelo (exemplo)', 'CLT', 'Presencial', 'sao-jose-do-rio-preto', 220000],
  ['Técnico de enfermagem', 'Saúde', 'Clínica Modelo (exemplo)', 'CLT', 'Presencial', 'sao-jose-do-rio-preto', 280000],
  ['Vendedor de loja', 'Comércio e varejo', 'Loja Modelo (exemplo)', 'CLT', 'Presencial', 'mirassol', null],
  ['Motorista de entregas', 'Logística e transporte', 'Transportes Modelo (exemplo)', 'Temporário', 'Presencial', 'bady-bassitt', 260000],
  ['Designer gráfico', 'Marketing e comunicação', 'Agência Modelo (exemplo)', 'PJ', 'Remoto', 'sao-jose-do-rio-preto', null],
  ['Estagiário de recursos humanos', 'Recursos humanos', 'Indústria Modelo (exemplo)', 'Estágio', 'Híbrido', 'catanduva', 140000],
  ['Recepcionista', 'Atendimento e vendas', 'Consultório Modelo (exemplo)', 'CLT', 'Presencial', 'sao-jose-do-rio-preto', 210000],
  ['Auxiliar de cozinha', 'Restaurantes e alimentação', 'Restaurante Modelo (exemplo)', 'CLT', 'Presencial', 'cedral', 190000],
] as const;

// Só existe em modo de demonstração. Em produção responde 404: nenhuma vaga falsa vai ao ar.
export async function POST() {
  if (!SIMULADOR) return new Response(null, { status: 404 });
  const db = await banco();
  let criadas = 0;
  for (const [i, [titulo, area, empresa, contrato, modalidade, cidadeSlug, salarioCentavos]] of EXEMPLOS.entries()) {
    const email = `exemplo${i + 1}@exemplo.invalid`;
    const r = await publicarSemConta(db, {
      nome: 'Pessoa Exemplo',
      email,
      telefone: '17999999999',
      empresa,
      vaga: { titulo, area, contrato, modalidade, cidadeSlug, salarioCentavos, descricao: 'Vaga fictícia, criada só para demonstrar o site. Esta empresa e esta vaga não existem.', requisitos: 'Vaga de demonstração', beneficios: 'Vaga de demonstração' },
    });
    if (r.ok) {
      criadas += 1;
      await db.update(usuarios).set({ emailConfirmadoEm: new Date() }).where(eq(usuarios.email, email));
    }
  }
  const [ja] = await db.select({ id: usuarios.id }).from(usuarios).where(eq(usuarios.email, CONTAS_TESTE.empresa));
  if (!ja) await contasDeTeste(db);
  return NextResponse.json({ criadas, contas: CONTAS_TESTE });
}

// PDF simples com texto, para o currículo de teste.
function pdf(linhas: string[]): Buffer {
  const esc = (t: string) => t.replace(/[\\()]/g, '\\$&');
  const conteudo = `BT /F1 13 Tf 72 760 Td 18 TL ${linhas.map((l) => `(${esc(l)}) Tj T*`).join(' ')} ET`;
  const objetos = ['<< /Type /Catalog /Pages 2 0 R >>', '<< /Type /Pages /Kids [3 0 R] /Count 1 >>', '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>', `<< /Length ${Buffer.byteLength(conteudo, 'latin1')} >>\nstream\n${conteudo}\nendstream`, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>'];
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

type Db = Awaited<ReturnType<typeof banco>>;
const MES = 30 * 24 * 60 * 60 * 1000;

// Duas contas cheias, para testar tudo sem preencher nada.
async function contasDeTeste(db: Db) {
  const idDe = async (email: string) => (await db.select({ id: usuarios.id }).from(usuarios).where(eq(usuarios.email, email)))[0]!.id;
  await criarConta(db, { tipo: 'contratante', nome: 'Ana Teste', email: CONTAS_TESTE.empresa, telefone: '17999990001', senha: CONTAS_TESTE.senha, empresa: 'Empresa Teste' });
  const emp = await idDe(CONTAS_TESTE.empresa);
  await db.update(usuarios).set({ emailConfirmadoEm: new Date() }).where(eq(usuarios.id, emp));
  const [e] = await db.select({ id: empresas.id }).from(empresas).where(eq(empresas.donoId, emp));
  const pasta = join(process.cwd(), 'public', 'demo');
  await db.update(empresas).set({ logo: readFileSync(join(pasta, 'logo.png')), logoMime: 'image/png', descricao: 'Empresa fictícia, criada só para testar o GR Vagas. Loja de roupas e acessórios no centro de Rio Preto.', perfil: { setor: 'Comércio e varejo', tamanho: '11 a 50 pessoas', fundacao: '2015', porQue: 'Equipe pequena, horários combinados e espaço para crescer.', cidadeSlug: 'sao-jose-do-rio-preto', endereco: 'Rua Exemplo, 100, Centro', site: 'empresateste.com.br', instagram: 'empresateste', whatsapp: '17999990001', razaoSocial: 'Empresa Teste Ltda.', cnpj: '11222333000181' } }).where(eq(empresas.id, e!.id));
  await aplicarEvento(db, { id: 'teste-empresa', usuarioId: emp, plano: 'profissional', tipo: 'pago', fimEm: new Date(Date.now() + MES) });

  const v1 = await publicarVaga(db, emp, e!.id, { titulo: 'Atendente de loja', area: 'Atendimento e vendas', contrato: 'CLT', modalidade: 'Presencial', cidadeSlug: 'sao-jose-do-rio-preto', salarioCentavos: 210000, descricao: 'Vaga de teste: atender clientes, organizar a loja e operar o caixa.', requisitos: 'Ensino médio completo\nGostar de atender pessoas', beneficios: 'Vale-transporte\nVale-refeição\nComissão' });
  const v2 = await publicarVaga(db, emp, e!.id, { titulo: 'Auxiliar de estoque', area: 'Logística e transporte', contrato: 'CLT', modalidade: 'Presencial', cidadeSlug: 'mirassol', salarioCentavos: 195000, descricao: 'Vaga de teste: receber mercadorias, organizar o estoque e separar pedidos.', requisitos: 'Organização\nDisponibilidade de horário', beneficios: 'Vale-transporte\nCesta básica' });
  if (!v1.ok || !v2.ok) return;
  await guardarImagemVaga(db, e!.id, v1.vagaId, readFileSync(join(pasta, 'foto.jpg')), 'image/jpeg');
  await salvarArte(db, e!.id, v1.vagaId, { modelo: 'poster', formato: 'feed', fundo: '#FFE7D9', destaque: '#F79C6B', texto: '#3B1F10', fonte: 'poppins', chamada: 'Estamos contratando', qr: 'vaga', qrEstilo: 'suave', whatsapp: '17999990001', destaques: ['Vale-transporte', 'Vale-refeição', 'Comissão'] });
  await salvarArte(db, e!.id, v2.vagaId, { modelo: 'ingresso', formato: 'retrato', fundo: '#DCEBFB', destaque: '#7FAEE3', texto: '#14213D', fonte: 'manrope', chamada: 'Vaga aberta', qr: 'vaga', qrEstilo: 'pontos', whatsapp: '', destaques: ['Vale-transporte', 'Cesta básica'] });

  // Candidato de teste: Plus, perfil, currículo, alerta, vaga salva e duas candidaturas.
  const c1 = await candidatarSemConta(db, { nome: 'Bruno Teste', email: CONTAS_TESTE.candidato, telefone: '17999990002', vagaId: v1.vagaId });
  const cand = await idDe(CONTAS_TESTE.candidato);
  await db.update(usuarios).set({ emailConfirmadoEm: new Date(), senhaHash: await hashSenha(CONTAS_TESTE.senha) }).where(eq(usuarios.id, cand));
  await salvarPerfil(db, cand, { titulo: 'Atendente', cidadeSlug: 'sao-jose-do-rio-preto', resumo: 'Três anos de experiência em atendimento e caixa em lojas de roupa. Ensino médio completo e curso de vendas.', aceiteTalentos: true, cv: { objetivo: 'Atuar com atendimento ao público', estadoCivil: 'Solteiro(a)', endereco: 'Rua Exemplo, 200, Boa Vista', portfolio: 'linkedin.com/in/brunoteste', idiomas: [{ lingua: 'Inglês', nivel: 'Básico' }, { lingua: 'Espanhol', nivel: 'Intermediário' }], formacao: [{ inicio: '2023', fim: '2023', curso: 'Técnicas de vendas', instituicao: 'SENAC', descricao: 'Atendimento, negociação e pós-venda.' }, { inicio: '2019', fim: '2021', curso: 'Ensino médio completo', instituicao: 'E.E. Exemplo', descricao: '' }], experiencias: [{ inicio: '2023', fim: '', atual: true, cargo: 'Atendente', empresa: 'Loja Exemplo', descricao: 'Atendimento no salão, caixa e organização de vitrine.' }, { inicio: '2021', fim: '2023', atual: false, cargo: 'Auxiliar de vendas', empresa: 'Magazine Exemplo', descricao: 'Reposição, apoio às vendas e controle de estoque.' }], habilidades: ['Atendimento', 'Caixa', 'Vendas', 'Pacote Office'] } });
  await guardarCurriculo(db, cand, 'curriculo-bruno-teste.pdf', pdf(['Bruno Teste', 'Atendente', 'candidato@teste.com | (17) 99999-0002', 'Sao Jose do Rio Preto - SP', '', 'Experiencia', 'Tres anos em atendimento e caixa em lojas de roupa.']));
  await aplicarEvento(db, { id: 'teste-candidato', usuarioId: cand, plano: 'plus', tipo: 'pago', fimEm: new Date(Date.now() + MES) });
  await criarAlerta(db, cand, 'atendente', 'sao-jose-do-rio-preto');
  const { candidatarLogado } = await import('@/lib/candidaturas');
  await candidatarLogado(db, { id: cand, tipo: 'candidato' }, v2.vagaId);
  await alternarSalva(db, cand, v2.vagaId);
  if (c1.ok) {
    await enviarMensagem(db, { candidaturaId: c1.candidaturaId, autorId: cand, texto: 'Olá! Tenho interesse na vaga e disponibilidade imediata.' }, async () => true);
    await enviarMensagem(db, { candidaturaId: c1.candidaturaId, autorId: emp, texto: 'Oi, Bruno! Gostei do seu perfil. Pode vir para uma entrevista na quinta às 10h?' }, async () => true);
    await mudarEtapa(db, c1.candidaturaId, emp, 'entrevista');
  }

  // Mais candidatos de exemplo na vaga da empresa, em etapas diferentes.
  const outros = [['Carla Exemplo', 'analise', 'Boa tarde! Trabalhei dois anos em loja de calçados.'], ['Diego Exemplo', 'novo', 'Olá, tenho interesse e moro perto da loja.'], ['Elisa Exemplo', 'contratado', ''], ['Fábio Exemplo', 'nao_seguiu', '']] as const;
  for (const [i, [nome, etapa, msg]] of outros.entries()) {
    const r = await candidatarSemConta(db, { nome, email: `pessoa${i + 1}@exemplo.invalid`, telefone: `1799999010${i}`, vagaId: v1.vagaId });
    if (!r.ok) continue;
    const id = await idDe(`pessoa${i + 1}@exemplo.invalid`);
    await salvarPerfil(db, id, { titulo: 'Atendente', cidadeSlug: 'sao-jose-do-rio-preto', resumo: 'Pessoa fictícia, criada para testar o painel.', aceiteTalentos: i < 2 });
    if (msg) await enviarMensagem(db, { candidaturaId: r.candidaturaId, autorId: id, texto: msg }, async () => true);
    await mudarEtapa(db, r.candidaturaId, emp, etapa);
  }
}
