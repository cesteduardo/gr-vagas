import { describe, expect, it } from 'vitest';
import { avisoDoIntervalo, calcularHorasExtras, extrasPorDiaEMes, duracao, horaDeIrEmbora, intervaloMinimo, paraHora, paraMinutos, pontoDoDia, voltaDoAlmoco } from './calculos';

describe('volta do almoço', () => {
  it('soma o intervalo', () => {
    expect(voltaDoAlmoco('12:03', 60)).toBe('13:03');
    expect(voltaDoAlmoco('11:45', 90)).toBe('13:15');
  });
  it('atravessa a meia-noite no turno da noite', () => expect(voltaDoAlmoco('23:30', 60)).toBe('00:30'));
  it('hora inválida não calcula', () => {
    expect(voltaDoAlmoco('25:00', 60)).toBeNull();
    expect(voltaDoAlmoco('', 60)).toBeNull();
    expect(paraMinutos('12:61')).toBeNull();
  });
  it('regras do art. 71', () => {
    expect(intervaloMinimo(480)).toBe(60);
    expect(intervaloMinimo(360)).toBe(15);
    expect(intervaloMinimo(240)).toBe(0);
    expect(avisoDoIntervalo(60, 480)).toBeNull();
    expect(avisoDoIntervalo(30, 480)).toContain('coletiva');
    expect(avisoDoIntervalo(20, 480)).toContain('pelo menos 1h');
    expect(avisoDoIntervalo(150, 480)).toContain('2 horas');
    expect(avisoDoIntervalo(10, 300)).toContain('15 min');
  });
  it('hora de ir embora desconta o que já trabalhou', () => {
    expect(horaDeIrEmbora({ entrada: '08:00', saidaAlmoco: '12:00', voltaAlmoco: '13:00', jornadaMin: 480 })).toBe('17:00');
    expect(horaDeIrEmbora({ entrada: '08:10', saidaAlmoco: '12:30', voltaAlmoco: '13:30', jornadaMin: 528 })).toBe('17:58');
    expect(horaDeIrEmbora({ entrada: '22:00', saidaAlmoco: '02:00', voltaAlmoco: '03:00', jornadaMin: 480 })).toBe('07:00');
  });
});

describe('ponto do dia', () => {
  const base = { entrada: '08:00', saidaAlmoco: '12:00', voltaAlmoco: '13:00', jornadaMin: 480 };
  it('dia exato não tem saldo', () => expect(pontoDoDia({ ...base, saida: '17:00' })).toMatchObject({ trabalhadoMin: 480, intervaloMin: 60, saldoMin: 0, extraMin: 0, faltaMin: 0, dentroDaTolerancia: false }));
  it('até 10 minutos é tolerância', () => expect(pontoDoDia({ ...base, saida: '17:10' })).toMatchObject({ extraMin: 0, dentroDaTolerancia: true }));
  it('passou de 10 minutos, conta tudo', () => expect(pontoDoDia({ ...base, saida: '17:11' })).toMatchObject({ extraMin: 11, dentroDaTolerancia: false }));
  it('saiu antes conta como falta', () => expect(pontoDoDia({ ...base, saida: '16:00' })).toMatchObject({ faltaMin: 60, extraMin: 0 }));
  it('turno que vira a noite', () => expect(pontoDoDia({ entrada: '22:00', saidaAlmoco: '02:00', voltaAlmoco: '03:00', saida: '07:00', jornadaMin: 480 })).toMatchObject({ trabalhadoMin: 480, saldoMin: 0 }));
  it('hora faltando não calcula', () => expect(pontoDoDia({ ...base, saida: '' })).toBeNull());
});

describe('horas extras', () => {
  it('confere com o exemplo clássico: R$ 3.000, 220h, 20h a 50%', () => {
    const r = calcularHorasExtras({ salario: 3000, divisor: 220, min50: 1200, min100: 0, diasUteis: 26, descansos: 4 })!;
    expect(r).toMatchObject({ valorHora: 13.64, valorExtra50: 20.45, total50: 409.09, dsr: 62.94, total: 472.03 });
  });
  it('100% em domingos e feriados', () => {
    const r = calcularHorasExtras({ salario: 2200, divisor: 220, min50: 0, min100: 480, diasUteis: 25, descansos: 5 })!;
    expect(r).toMatchObject({ valorHora: 10, valorExtra100: 20, total100: 160, dsr: 32, total: 192 });
  });
  it('divisor menor paga mais', () => {
    const a = calcularHorasExtras({ salario: 3000, divisor: 220, min50: 60, min100: 0, diasUteis: 26, descansos: 4 })!;
    const b = calcularHorasExtras({ salario: 3000, divisor: 200, min50: 60, min100: 0, diasUteis: 26, descansos: 4 })!;
    expect(b.totalExtras).toBeGreaterThan(a.totalExtras);
  });
  it('sem salário não calcula; sem dias úteis, sem DSR', () => {
    expect(calcularHorasExtras({ salario: 0, divisor: 220, min50: 60, min100: 0, diasUteis: 26, descansos: 4 })).toBeNull();
    expect(calcularHorasExtras({ salario: 1000, divisor: 220, min50: 60, min100: 0, diasUteis: 0, descansos: 4 })!.dsr).toBe(0);
  });
  it('formatos', () => {
    expect(duracao(90)).toBe('1h30');
    expect(duracao(60)).toBe('1h');
    expect(duracao(45)).toBe('45 min');
    expect(paraHora(-30)).toBe('23:30');
  });
});

describe('máscara de hora', () => {
  it('põe os dois pontos e limita a quatro números', async () => {
    const { mascararHora } = await import('@/components/campo-hora');
    expect(mascararHora('1203')).toBe('12:03');
    expect(mascararHora('12:03')).toBe('12:03');
    expect(mascararHora('9')).toBe('9');
    expect(mascararHora('12a3456')).toBe('12:34');
  });
});

describe('extra por dia e no mês', () => {
  it('1 hora por dia em 22 dias', () => {
    const r = extrasPorDiaEMes({ salario: 2200, divisor: 220, minDia50: 60, dias50: 22, minDia100: 0, dias100: 0, diasUteis: 26, descansos: 4 })!;
    expect(r.porDia50).toBe(15);
    expect(r.minMes50).toBe(1320);
    expect(r.mes.totalExtras).toBe(330);
    expect(r.mes.dsr).toBe(50.77);
    expect(r.mes.total).toBe(380.77);
  });
  it('domingo a 100% entra separado', () => {
    const r = extrasPorDiaEMes({ salario: 2200, divisor: 220, minDia50: 0, dias50: 0, minDia100: 120, dias100: 2, diasUteis: 26, descansos: 4 })!;
    expect(r.porDia100).toBe(40);
    expect(r.mes.total100).toBe(80);
  });
  it('sem salário não calcula', () => {
    expect(extrasPorDiaEMes({ salario: 0, divisor: 220, minDia50: 60, dias50: 1, minDia100: 0, dias100: 0, diasUteis: 26, descansos: 4 })).toBeNull();
  });
});
