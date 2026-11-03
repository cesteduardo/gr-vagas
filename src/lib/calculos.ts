// Contas de jornada. Puras, para rodarem no navegador e serem testadas sem tela.
const DIA = 24 * 60;

export function paraMinutos(hora: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hora.trim());
  if (!m) return null;
  const [h, min] = [Number(m[1]), Number(m[2])];
  return h < 24 && min < 60 ? h * 60 + min : null;
}

const doisDigitos = (n: number) => String(n).padStart(2, '0');
export const paraHora = (minutos: number) => {
  const m = ((minutos % DIA) + DIA) % DIA;
  return `${doisDigitos(Math.floor(m / 60))}:${doisDigitos(m % 60)}`;
};

export function duracao(minutos: number): string {
  const m = Math.abs(minutos);
  const [h, r] = [Math.floor(m / 60), m % 60];
  if (!h) return `${r} min`;
  return r ? `${h}h${doisDigitos(r)}` : `${h}h`;
}

// Do início ao fim, atravessando a meia-noite quando for o caso.
const entre = (inicio: number, fim: number) => (fim >= inicio ? fim - inicio : fim + DIA - inicio);

export function voltaDoAlmoco(saida: string, intervaloMin: number): string | null {
  const s = paraMinutos(saida);
  return s === null || !(intervaloMin >= 0) ? null : paraHora(s + intervaloMin);
}

// Art. 71 da CLT: até 4h não exige intervalo; de 4h a 6h, 15 minutos; acima de 6h, de 1h a 2h.
export function intervaloMinimo(jornadaMin: number): number {
  if (jornadaMin > 360) return 60;
  return jornadaMin > 240 ? 15 : 0;
}

export function avisoDoIntervalo(intervaloMin: number, jornadaMin: number): string | null {
  const minimo = intervaloMinimo(jornadaMin);
  if (intervaloMin < minimo) {
    if (minimo === 60 && intervaloMin >= 30) return 'Abaixo de 1 hora só vale com acordo ou convenção coletiva, e nunca menos de 30 minutos.';
    return `A CLT pede pelo menos ${duracao(minimo)} de intervalo nessa jornada.`;
  }
  if (minimo === 60 && intervaloMin > 120) return 'Acima de 2 horas de intervalo a CLT pede acordo escrito ou convenção coletiva.';
  return null;
}

export function horaDeIrEmbora(d: { entrada: string; saidaAlmoco: string; voltaAlmoco: string; jornadaMin: number }): string | null {
  const [e, s, v] = [paraMinutos(d.entrada), paraMinutos(d.saidaAlmoco), paraMinutos(d.voltaAlmoco)];
  if (e === null || s === null || v === null) return null;
  const antesDoAlmoco = entre(e, s);
  return paraHora(v + Math.max(0, d.jornadaMin - antesDoAlmoco));
}

export type Ponto = { trabalhadoMin: number; intervaloMin: number; saldoMin: number; extraMin: number; faltaMin: number; dentroDaTolerancia: boolean };

// Art. 58, § 1º: até 10 minutos por dia não contam. Passou disso, conta o tempo todo.
export function pontoDoDia(d: { entrada: string; saidaAlmoco: string; voltaAlmoco: string; saida: string; jornadaMin: number }): Ponto | null {
  const [e, s, v, f] = [paraMinutos(d.entrada), paraMinutos(d.saidaAlmoco), paraMinutos(d.voltaAlmoco), paraMinutos(d.saida)];
  if (e === null || s === null || v === null || f === null) return null;
  const trabalhadoMin = entre(e, s) + entre(v, f);
  const saldoMin = trabalhadoMin - d.jornadaMin;
  const dentroDaTolerancia = saldoMin !== 0 && Math.abs(saldoMin) <= 10;
  return { trabalhadoMin, intervaloMin: entre(s, v), saldoMin, extraMin: !dentroDaTolerancia && saldoMin > 0 ? saldoMin : 0, faltaMin: !dentroDaTolerancia && saldoMin < 0 ? -saldoMin : 0, dentroDaTolerancia };
}

const centavos = (v: number) => Math.round(v * 100) / 100;

export type HoraExtra = { valorHora: number; valorExtra50: number; valorExtra100: number; total50: number; total100: number; totalExtras: number; dsr: number; total: number };

export function calcularHorasExtras(d: { salario: number; divisor: number; min50: number; min100: number; diasUteis: number; descansos: number }): HoraExtra | null {
  if (!(d.salario > 0) || !(d.divisor > 0)) return null;
  const valorHora = d.salario / d.divisor;
  const total50 = (valorHora * 1.5 * Math.max(0, d.min50)) / 60;
  const total100 = (valorHora * 2 * Math.max(0, d.min100)) / 60;
  const totalExtras = total50 + total100;
  const dsr = d.diasUteis > 0 ? (totalExtras / d.diasUteis) * Math.max(0, d.descansos) : 0;
  return { valorHora: centavos(valorHora), valorExtra50: centavos(valorHora * 1.5), valorExtra100: centavos(valorHora * 2), total50: centavos(total50), total100: centavos(total100), totalExtras: centavos(totalExtras), dsr: centavos(dsr), total: centavos(totalExtras + dsr) };
}

export type ExtraDoMes = { porDia50: number; porDia100: number; minMes50: number; minMes100: number; mes: HoraExtra };

/** Hora extra por dia e no mês: o que se ganha num dia e o total de N dias iguais, com o reflexo no descanso. */
export function extrasPorDiaEMes(d: { salario: number; divisor: number; minDia50: number; dias50: number; minDia100: number; dias100: number; diasUteis: number; descansos: number }): ExtraDoMes | null {
  const minMes50 = Math.max(0, d.minDia50) * Math.max(0, d.dias50);
  const minMes100 = Math.max(0, d.minDia100) * Math.max(0, d.dias100);
  const mes = calcularHorasExtras({ salario: d.salario, divisor: d.divisor, min50: minMes50, min100: minMes100, diasUteis: d.diasUteis, descansos: d.descansos });
  if (!mes) return null;
  const valorHora = d.salario / d.divisor;
  return { porDia50: centavos((valorHora * 1.5 * Math.max(0, d.minDia50)) / 60), porDia100: centavos((valorHora * 2 * Math.max(0, d.minDia100)) / 60), minMes50, minMes100, mes };
}
