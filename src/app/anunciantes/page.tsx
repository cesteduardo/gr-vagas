import type { Metadata } from 'next';
import Link from 'next/link';
import { FaixaArtes } from '@/components/heroi-arte';
import { Rodape, Topo } from '@/components/moldura';
import { PortaEmpresa } from '@/components/portas';
import { Hero, Perguntas } from '@/components/blocos';
import { PLANOS_EMPRESA, precoEmReais, URL_SITE } from '@/lib/config';

export const metadata: Metadata = { title: 'Para empresas: anuncie sua vaga em Rio Preto', description: 'Anuncie vagas em São José do Rio Preto e região: arte personalizada com QR Code, destaque na página inicial e candidatos num lugar só. Comece grátis.', alternates: { canonical: '/anunciantes' } };

const ONDE = [
  ['Carrossel de vagas', 'Sua vaga passa na página inicial, na frente de quem entra procurando emprego. Vagas em destaque vêm primeiro.'],
  ['Letreiro de empresas', 'O nome e o logo da sua empresa passam na página inicial. Um toque leva às suas vagas.'],
  ['Busca e cidades', 'A vaga aparece na busca, na página da cidade e na página da sua empresa.'],
  ['Onde você postar', 'Instagram, Status, grupos e até impressa. O QR Code traz o candidato direto para você.'],
];

const FACILITA = [
  ['Cole o texto que você já usa', 'A mensagem que vai nos grupos vira uma vaga organizada, com cargo, salário, requisitos e benefícios.'],
  ['Personalize a arte', 'Modelos, paletas, as suas cores, fontes da Poppins à Times New Roman, sua foto e seu logo.'],
  ['Escolha para onde o QR Code leva', 'Para a página da vaga, com candidatura organizada, ou direto para o seu WhatsApp.'],
  ['Receba candidatos arrumados', 'Etapas, currículo, conversa e botão para o WhatsApp, tudo por vaga.'],
];

export default function Anunciantes() {
  return (
    <>
      <Topo />
      <main>
        <Hero titulo="Anuncie" cinza="sem dor de cabeça." texto="Publique em minutos, poste uma arte bonita e fale com os candidatos num lugar só." lado={<PortaEmpresa link={URL_SITE} />}>
          <div className="linha-botoes" style={{ marginTop: 28 }}>
            <Link className="btn" href="/criar-conta?tipo=contratante&destino=/publicar">Criar conta da empresa</Link>
            <Link className="btn btn-claro" href="#planos">Ver planos</Link>
          </div>
          <p className="heroi-empresa">Já anuncia aqui? <Link href="/entrar?destino=/painel">Entrar no painel</Link></p>
        </Hero>
        <FaixaArtes link={URL_SITE} />
        <div className="folha">
          <section className="secao embrulho">
            <div className="secao-cabeca"><h2>Como é fácil <em>anunciar</em></h2></div>
            <ol className="grade-passos">
              {FACILITA.map(([t, d]) => <li key={t}><h3>{t}</h3><p>{d}</p></li>)}
            </ol>
          </section>
          <section className="secao embrulho">
            <div className="secao-cabeca"><h2>Onde sua vaga <em>aparece</em></h2></div>
            <ul className="grade-onde">
              {ONDE.map(([t, d], i) => <li key={t} className={`tom-${i % 4}`}><h3>{t}</h3><p>{d}</p></li>)}
            </ul>
          </section>
          <section className="secao embrulho" id="planos">
            <div className="secao-cabeca">
              <h2>Planos</h2>
              <p className="secao-nota">Toda a personalização da arte é grátis. Sem fidelidade: cancele quando quiser.</p>
            </div>
            <div className="grade-planos" style={{ marginTop: 0 }}>
              {PLANOS_EMPRESA.map((p) => (
                <article key={p.id} className={`plano${p.id === 'essencial' ? ' plano-forte' : ''}`}>
                  <h3>{p.nome}</h3>
                  <div className="plano-preco">{p.preco ? precoEmReais(p.preco) : 'R$ 0'}<small> por mês</small></div>
                  <p className="leve">{p.resumo}</p>
                  <ul>{p.itens.map((i) => <li key={i}>{i}</li>)}</ul>
                  <Link className="btn" href="/publicar">Publicar vaga</Link>
                </article>
              ))}
            </div>
          </section>
          <Perguntas itens={[
            { p: 'Preciso pagar para publicar?', r: 'Não. O plano grátis deixa duas vagas abertas ao mesmo tempo, com toda a personalização da arte.' },
            { p: 'Como os candidatos chegam?', r: 'Pela arte postada (o QR Code leva à vaga), pela página inicial, pela busca e pela página da sua empresa.' },
            { p: 'Posso receber os candidatos no WhatsApp?', r: 'Pode. Na arte, escolha o QR Code do seu WhatsApp. Pelo site, cada candidatura tem conversa e botão para o WhatsApp.' },
            { p: 'E se eu quiser cancelar o plano?', r: 'Sem fidelidade: o plano vale até o fim do período pago e depois a conta volta ao grátis.' },
          ]} />
        </div>
      </main>
      <Rodape />
    </>
  );
}
