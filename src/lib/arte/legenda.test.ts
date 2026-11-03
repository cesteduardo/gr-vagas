import { describe, expect, it } from 'vitest';
import { juntarLegenda, legendaDaVaga, partesDaLegenda, type DadosLegenda } from './legenda';

const d: DadosLegenda = { titulo: 'Auxiliar de Cozinha', empresa: 'Restaurante Sabor', cidade: 'São José do Rio Preto', uf: 'SP', contrato: 'CLT', modalidade: 'Presencial', salario: 'R$ 1.900,00', beneficios: 'Vale-transporte\n- Refeição no local', requisitos: 'Experiência em cozinha', area: 'Restaurantes', link: 'https://grvagas.com.br/vagas/x' };

describe('legenda', () => {
  it('Instagram traz o essencial, a instrução e hashtags da cidade', () => {
    const t = legendaDaVaga(d, 'instagram');
    for (const trecho of ['Auxiliar de Cozinha', 'R$ 1.900,00', 'CLT, presencial', '✓ Vale-transporte', '✓ Refeição no local', '✓ Experiência em cozinha', 'QR Code', d.link, '#VagasRioPreto', '#VagaAuxiliarCozinha']) expect(t).toContain(trecho);
  });
  it('WhatsApp usa negrito do próprio WhatsApp', () => {
    const t = legendaDaVaga(d, 'whatsapp');
    expect(t).toContain('*Vaga: Auxiliar de Cozinha*');
    expect(t).toContain(`*Candidate-se aqui:* ${d.link}`);
    expect(t).not.toContain('#');
  });
  it('curta cabe em poucas linhas', () => {
    expect(legendaDaVaga(d, 'curta').split('\n').length).toBeLessThanOrEqual(3);
  });
  it('não cria seções vazias nem inventa', () => {
    const t = legendaDaVaga({ ...d, beneficios: '', requisitos: '', salario: 'A combinar' }, 'instagram');
    expect(t).not.toContain('O que oferecemos');
    expect(t).not.toContain('O que procuramos');
    expect(t).toContain('Salário: a combinar');
  });
  it('cidade da região gera a hashtag dela', () => {
    expect(legendaDaVaga({ ...d, cidade: 'Monte Aprazível' }, 'instagram')).toContain('#VagasMonteAprazivel');
  });
});

describe('legenda em partes', () => {
  it('cada parte é editável e juntar dá a legenda inteira', () => {
    const p = partesDaLegenda(d, 'instagram');
    expect(juntarLegenda(p, 'instagram')).toBe(legendaDaVaga(d, 'instagram'));
    expect(juntarLegenda({ ...p, beneficios: '' }, 'instagram')).not.toContain('O que oferecemos');
  });
});
