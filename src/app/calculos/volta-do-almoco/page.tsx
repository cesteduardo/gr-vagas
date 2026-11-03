import type { Metadata } from 'next';
import { CabecaCalculos } from '@/components/cabeca-calculos';
import { VoltaDoAlmoco } from '@/components/calculadoras';

export const metadata: Metadata = { title: 'Calculadora de volta do almoço', description: 'Saiu para o almoço? Veja a que horas precisa voltar e a hora de ir embora. Grátis, sem cadastro, com as regras de intervalo da CLT.', alternates: { canonical: '/calculos/volta-do-almoco' } };

export default function Pagina() {
  return (
    <>
      <CabecaCalculos titulo="Volta do almoço." cinza="Sem fazer conta." texto="Diga que horas você saiu. A gente mostra a hora de voltar e a de ir embora." />
      <div className="folha">
        <section className="secao embrulho"><VoltaDoAlmoco /></section>
        <section className="embrulho calc-nota">
        <h2>O que diz a CLT</h2>
        <p>Pelo art. 71, jornada acima de 6 horas tem intervalo de 1 a 2 horas. De 4 a 6 horas, são 15 minutos. Acordo ou convenção coletiva pode reduzir para até 30 minutos em jornadas acima de 6 horas. O cálculo é uma orientação: vale o que estiver no seu contrato e na convenção da sua categoria.</p>
        </section>
      </div>
    </>
  );
}
