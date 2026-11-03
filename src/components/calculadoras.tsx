'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { avisoDoIntervalo, duracao, extrasPorDiaEMes, horaDeIrEmbora, paraHora, paraMinutos, pontoDoDia, voltaDoAlmoco } from '@/lib/calculos';
import { lerSalario } from '@/lib/texto';
import { SeletorHora } from './campo-hora';
import { Selecao } from './selecao';
import { Segmentado } from './segmentado';

const agoraHHMM = () => {
  const d = new Date();
  return paraHora(d.getHours() * 60 + d.getMinutes());
};
const INTERVALOS = [30, 60, 90, 120];
const JORNADAS = [
  { min: 480, nome: '8 horas por dia' },
  { min: 528, nome: '8h48 por dia (44h em 5 dias)' },
  { min: 440, nome: '7h20 por dia (44h em 6 dias)' },
  { min: 360, nome: '6 horas por dia' },
  { min: 240, nome: '4 horas por dia' },
];
const reais = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

function Rotulo({ texto, children, grande }: { texto: string; children: ReactNode; grande?: boolean }) {
  return (
    <div className={`calc-campo${grande ? ' grande' : ''}`}>
      <span className="calc-rotulo">{texto}</span>
      {children}
    </div>
  );
}

function Hora({ valor, muda, rotulo, comAgora, grande, inicial }: { valor: string; muda: (v: string) => void; rotulo: string; comAgora?: boolean; grande?: boolean; inicial?: string }) {
  return (
    <Rotulo texto={rotulo} grande={grande}>
      <span className="calc-hora">
        <SeletorHora valor={valor} muda={muda} rotulo={rotulo} inicial={inicial} />
        {comAgora ? <button type="button" className="btn btn-claro btn-peq" onClick={() => muda(agoraHHMM())}>Agora</button> : null}
      </span>
    </Rotulo>
  );
}

function Segmentos<T extends string | number>({ rotulo, opcoes, valor, muda }: { rotulo: string; opcoes: { id: T; nome: string }[]; valor: T; muda: (v: T) => void }) {
  return (
    <Rotulo texto={rotulo}>
      <Segmentado cheio rotulo={rotulo} opcoes={opcoes} valor={valor} muda={muda} />
    </Rotulo>
  );
}

function Jornada({ valor, muda }: { valor: number; muda: (v: number) => void }) {
  return (
    <Rotulo texto="Sua jornada">
      <Selecao aria-label="Jornada por dia" value={valor} onChange={(e) => muda(Number(e.target.value))}>{JORNADAS.map((j) => <option key={j.min} value={j.min}>{j.nome}</option>)}</Selecao>
    </Rotulo>
  );
}

// Anel que enche enquanto o intervalo passa.
function Anel({ parte }: { parte: number }) {
  const c = 2 * Math.PI * 52;
  return (
    <svg className="anel" viewBox="0 0 120 120" aria-hidden="true">
      <circle cx="60" cy="60" r="52" />
      <circle cx="60" cy="60" r="52" className="anel-cheio" strokeDasharray={c} strokeDashoffset={c * (1 - parte)} />
    </svg>
  );
}

export function VoltaDoAlmoco() {
  const [saida, setSaida] = useState('');
  const [intervalo, setIntervalo] = useState(60);
  const [jornada, setJornada] = useState(480);
  const [entrada, setEntrada] = useState('');
  const [agora, setAgora] = useState<number | null>(null);

  useEffect(() => {
    const tique = () => {
      const d = new Date();
      setAgora(d.getHours() * 60 + d.getMinutes());
    };
    tique();
    setSaida((s) => s || agoraHHMM());
    const t = setInterval(tique, 20000);
    return () => clearInterval(t);
  }, []);

  const volta = voltaDoAlmoco(saida, intervalo);
  const aviso = avisoDoIntervalo(intervalo, jornada);
  const embora = entrada && volta ? horaDeIrEmbora({ entrada, saidaAlmoco: saida, voltaAlmoco: volta, jornadaMin: jornada }) : null;
  const vMin = volta ? paraMinutos(volta) : null;
  const falta = vMin !== null && agora !== null ? (vMin - agora + 1440) % 1440 : null;
  const noIntervalo = falta !== null && falta <= intervalo && falta > 0;

  return (
    <div className="calc-app">
      <div className="calc-cartao">
        <Hora rotulo="Saí para o almoço às" valor={saida} muda={setSaida} comAgora grande />
        <Segmentos rotulo="Tempo de intervalo" opcoes={INTERVALOS.map((m) => ({ id: m, nome: duracao(m) }))} valor={intervalo} muda={setIntervalo} />
        {aviso ? <p className="aviso">{aviso}</p> : null}
        <div className="calc-separador"><span>Para saber a hora de ir embora</span></div>
        <div className="calc-par">
          <Hora rotulo="Entrei hoje às" valor={entrada} muda={setEntrada} inicial="08:00" />
          <Jornada valor={jornada} muda={setJornada} />
        </div>
      </div>
      <div className="calc-saida" aria-live="polite">
        <div className="calc-destaque tom-1">
          {noIntervalo ? <Anel parte={(intervalo - falta!) / intervalo} /> : null}
          <p>Volte às</p>
          <strong data-resultado="volta">{volta ?? '--:--'}</strong>
          <p>{noIntervalo ? `Faltam ${duracao(falta!)}` : `Depois de ${duracao(intervalo)} de intervalo`}</p>
        </div>
        <div className="calc-destaque menor tom-0">
          <p>Hora de ir embora</p>
          <strong data-resultado="embora">{embora ?? '--:--'}</strong>
          <p>{embora ? `Com ${JORNADAS.find((j) => j.min === jornada)?.nome}` : 'Diga a que horas entrou.'}</p>
        </div>
      </div>
    </div>
  );
}

const soNumero = (v: string, max: number) => v.replace(/\D/g, '').slice(0, max);

function Contador({ valor, muda, rotulo, unidade, max = 3, passo = 1 }: { valor: string; muda: (v: string) => void; rotulo: string; unidade: string; max?: number; passo?: number }) {
  const n = Number(valor) || 0;
  return (
    <span className="contador">
      <button type="button" aria-label={`Menos em ${rotulo}`} onClick={() => muda(String(Math.max(0, n - passo)))}>−</button>
      <input type="text" inputMode="numeric" aria-label={rotulo} placeholder="0" value={valor} onChange={(e) => muda(soNumero(e.target.value, max))} />
      <span className="contador-unidade">{unidade}</span>
      <button type="button" aria-label={`Mais em ${rotulo}`} onClick={() => muda(String(n + passo))}>+</button>
    </span>
  );
}

function Duracao({ h, m, setH, setM, rotulo }: { h: string; m: string; setH: (v: string) => void; setM: (v: string) => void; rotulo: string }) {
  return (
    <span className="calc-par-contador">
      <Contador valor={h} muda={setH} rotulo={`${rotulo}: horas`} unidade="h" max={2} />
      <Contador valor={m} muda={(v) => setM(String(Math.min(59, Number(v) || 0) || ''))} rotulo={`${rotulo}: minutos`} unidade="min" max={2} passo={10} />
    </span>
  );
}

type Base = { salario: string; setSalario: (v: string) => void; divisor: number; setDivisor: (v: number) => void };

function Salario({ salario, setSalario, divisor, setDivisor }: Base) {
  return (
    <>
      <Rotulo texto="Salário bruto por mês" grande>
        <span className="calc-dinheiro">R$<input type="text" inputMode="decimal" aria-label="Salário bruto por mês" placeholder="3.000,00" value={salario} onChange={(e) => setSalario(e.target.value.replace(/[^\d.,]/g, ''))} /></span>
      </Rotulo>
      <Segmentos rotulo="Jornada por semana" opcoes={[{ id: 220, nome: '44h' }, { id: 200, nome: '40h' }, { id: 180, nome: '36h' }, { id: 150, nome: '30h' }]} valor={divisor} muda={setDivisor} />
    </>
  );
}

const minutos = (h: string, m: string) => (Number(h) || 0) * 60 + Math.min(59, Number(m) || 0);

function PorDiaEMes(b: Base) {
  const [h50, setH50] = useState('1');
  const [m50, setM50] = useState('');
  const [dias50, setDias50] = useState('22');
  const [h100, setH100] = useState('');
  const [m100, setM100] = useState('');
  const [dias100, setDias100] = useState('');
  const [uteis, setUteis] = useState('26');
  const [desc, setDesc] = useState('4');
  const centavos = lerSalario(b.salario);
  const min50 = minutos(h50, m50);
  const min100 = minutos(h100, m100);
  const r = centavos ? extrasPorDiaEMes({ salario: centavos / 100, divisor: b.divisor, minDia50: min50, dias50: Number(dias50) || 0, minDia100: min100, dias100: Number(dias100) || 0, diasUteis: Number(uteis) || 0, descansos: Number(desc) || 0 }) : null;
  const nDias = (Number(dias50) || 0) + (Number(dias100) || 0);
  return (
    <div className="calc-app">
      <div className="calc-cartao">
        <Salario {...b} />
        <div className="calc-separador"><span>Dias úteis, com 50% a mais</span></div>
        <div className="calc-par">
          <Rotulo texto="Hora extra por dia"><Duracao h={h50} m={m50} setH={setH50} setM={setM50} rotulo="Hora extra por dia útil" /></Rotulo>
          <Rotulo texto="Em quantos dias"><Contador valor={dias50} muda={setDias50} rotulo="Dias úteis com hora extra" unidade="dias" max={2} /></Rotulo>
        </div>
        <details className="caixa-dobra">
          <summary>Domingos e feriados, com 100% a mais</summary>
          <div className="calc-par">
            <Rotulo texto="Hora extra por dia"><Duracao h={h100} m={m100} setH={setH100} setM={setM100} rotulo="Hora extra por domingo ou feriado" /></Rotulo>
            <Rotulo texto="Em quantos dias"><Contador valor={dias100} muda={setDias100} rotulo="Domingos e feriados com hora extra" unidade="dias" max={2} /></Rotulo>
          </div>
        </details>
        <details className="caixa-dobra">
          <summary>Calendário do mês: {uteis || 0} dias úteis e {desc || 0} de descanso</summary>
          <span className="calc-par-contador">
            <Contador valor={uteis} muda={setUteis} rotulo="Dias úteis no mês" unidade="úteis" max={2} />
            <Contador valor={desc} muda={setDesc} rotulo="Domingos e feriados no mês" unidade="descanso" max={2} />
          </span>
        </details>
      </div>
      <div className="calc-saida" aria-live="polite">
        <div className="calc-destaque tom-0">
          <p>Por dia{min50 ? ` com ${duracao(min50)} de extra` : ''}</p>
          <strong data-resultado="dia">{r ? reais(r.porDia50) : 'R$ 0,00'}</strong>
          <p>{r ? (r.porDia100 ? `No domingo ou feriado: ${reais(r.porDia100)}` : 'O que cada dia assim rende a mais.') : 'Diga quanto ganha por mês.'}</p>
        </div>
        <div className="calc-destaque tom-1">
          <p>No mês, em {nDias} {nDias === 1 ? 'dia' : 'dias'}</p>
          <strong data-resultado="total">{r ? reais(r.mes.total) : 'R$ 0,00'}</strong>
          <p>{r ? `${duracao(r.minMes50 + r.minMes100)} de extra, já com o reflexo no descanso.` : 'Valor bruto, antes de INSS e Imposto de Renda.'}</p>
        </div>
        {r ? (
          <dl className="calc-linhas">
            <div><dt>Sua hora normal</dt><dd>{reais(r.mes.valorHora)}</dd></div>
            <div><dt>Hora extra a 50%</dt><dd>{reais(r.mes.valorExtra50)}</dd></div>
            <div><dt>Hora extra a 100%</dt><dd>{reais(r.mes.valorExtra100)}</dd></div>
            <div><dt>Extras do mês</dt><dd>{reais(r.mes.totalExtras)}</dd></div>
            <div><dt>Reflexo no descanso (DSR)</dt><dd>{reais(r.mes.dsr)}</dd></div>
          </dl>
        ) : null}
      </div>
    </div>
  );
}

function PeloPonto(b: Base) {
  const [entrada, setEntrada] = useState('08:00');
  const [saidaAlmoco, setSaidaAlmoco] = useState('12:00');
  const [voltaAlmoco, setVoltaAlmoco] = useState('13:00');
  const [saida, setSaida] = useState('');
  const [jornada, setJornada] = useState(480);
  const [dias, setDias] = useState('22');
  const p = pontoDoDia({ entrada, saidaAlmoco, voltaAlmoco, saida, jornadaMin: jornada });
  const aviso = p ? avisoDoIntervalo(p.intervaloMin, jornada) : null;
  const manha = p ? p.trabalhadoMin - ((paraMinutos(saida)! - paraMinutos(voltaAlmoco)! + 1440) % 1440) : 0;
  const centavos = lerSalario(b.salario);
  const r = centavos && p?.extraMin ? extrasPorDiaEMes({ salario: centavos / 100, divisor: b.divisor, minDia50: p.extraMin, dias50: Number(dias) || 0, minDia100: 0, dias100: 0, diasUteis: 26, descansos: 4 }) : null;
  return (
    <div className="calc-app">
      <div className="calc-cartao">
        <div className="calc-par">
          <Hora rotulo="Entrada" valor={entrada} muda={setEntrada} />
          <Hora rotulo="Saída para o almoço" valor={saidaAlmoco} muda={setSaidaAlmoco} />
          <Hora rotulo="Volta do almoço" valor={voltaAlmoco} muda={setVoltaAlmoco} />
          <Hora rotulo="Saída" valor={saida} muda={setSaida} inicial="17:00" />
        </div>
        <Jornada valor={jornada} muda={setJornada} />
        {aviso ? <p className="aviso">{aviso}</p> : null}
        <div className="calc-separador"><span>Para ver em reais</span></div>
        <Salario {...b} />
        <Rotulo texto="Se fizer isso em quantos dias"><Contador valor={dias} muda={setDias} rotulo="Dias com a mesma hora extra" unidade="dias" max={2} /></Rotulo>
      </div>
      <div className="calc-saida" aria-live="polite">
        <div className="calc-destaque tom-0">
          <p>{p?.faltaMin ? 'Ficou faltando' : 'Hora extra hoje'}</p>
          <strong data-resultado="extra">{p ? (p.faltaMin ? duracao(p.faltaMin) : p.extraMin ? duracao(p.extraMin) : '0 min') : '--'}</strong>
          <p>{p ? (p.dentroDaTolerancia ? `A diferença de ${duracao(p.saldoMin)} fica dentro da tolerância de 10 minutos por dia.` : `Trabalhou ${duracao(p.trabalhadoMin)} e teve ${duracao(p.intervaloMin)} de intervalo.`) : 'Diga a que horas foi embora.'}</p>
        </div>
        {r ? (
          <div className="calc-par-saida">
            <div className="calc-destaque menor tom-1">
              <p>Hoje você recebe</p>
              <strong data-resultado="hoje">{reais(r.porDia50)}</strong>
              <p>a mais, bruto</p>
            </div>
            <div className="calc-destaque menor tom-1">
              <p>Em {Number(dias) || 0} dias assim</p>
              <strong data-resultado="mes-ponto">{reais(r.mes.total)}</strong>
              <p>com o reflexo no descanso</p>
            </div>
          </div>
        ) : null}
        {p ? (
          <div className="linha-do-dia" aria-label={`Trabalhou ${duracao(p.trabalhadoMin)}, com ${duracao(p.intervaloMin)} de intervalo`}>
            <span style={{ flex: manha }}>{entrada}</span>
            <span className="almoco" style={{ flex: p.intervaloMin }}>Almoço</span>
            <span style={{ flex: p.trabalhadoMin - manha }}>{saida}</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function HorasExtras() {
  const [aba, setAba] = useState<'mes' | 'ponto'>('mes');
  const [salario, setSalario] = useState('');
  const [divisor, setDivisor] = useState(220);
  const base = { salario, setSalario, divisor, setDivisor };
  return (
    <>
      <div className="calc-abas">
        <Segmentado rotulo="O que calcular" opcoes={[{ id: 'mes', nome: 'Por dia e no mês' }, { id: 'ponto', nome: 'Pelo ponto de hoje' }] as const} valor={aba} muda={setAba} />
      </div>
      {aba === 'mes' ? <PorDiaEMes {...base} /> : <PeloPonto {...base} />}
    </>
  );
}

export function Imprimir() {
  return <button type="button" className="btn" onClick={() => window.print()}>Salvar em PDF</button>;
}
