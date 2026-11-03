import type { Metadata } from 'next';
import { HorasExtras } from '@/components/calculadoras';

export const metadata: Metadata = { title: 'Calculadora de horas extras', description: 'Calcule horas extras a 50% e 100% com reflexo no DSR, ou confira quanto fez hoje pelo horário de ponto. Grátis e sem cadastro.', alternates: { canonical: '/calculos/horas-extras' } };

export default function Pagina() {
  return (
    <>
      <div className="folha">
        <section className="secao embrulho"><HorasExtras /></section>
        <section className="embrulho calc-nota">
        <h2>Como a conta é feita</h2>
        <p>Salário dividido pelas horas do mês (220 para 44 horas semanais), mais 50% em dia útil e 100% em domingo e feriado. O reflexo no descanso é o total das extras dividido pelos dias úteis, vezes os domingos e feriados. Até 10 minutos de diferença por dia não contam como extra (art. 58 da CLT). A conta é uma estimativa: não inclui adicional noturno, e a convenção da sua categoria pode prever percentuais maiores.</p>
        </section>
      </div>
    </>
  );
}
