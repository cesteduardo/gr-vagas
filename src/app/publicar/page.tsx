import type { Metadata } from 'next';
import { eq } from 'drizzle-orm';
import Link from 'next/link';
import { FormPublicar } from '@/components/form-publicar';
import { Folha, Hero } from '@/components/blocos';
import { Rodape, Topo } from '@/components/moldura';
import { usuarioAtual } from '@/lib/auth/sessao';
import { SIMULADOR, URL_SITE } from '@/lib/config';
import { banco } from '@/lib/db/client';
import { empresas } from '@/lib/db/schema';

export const metadata: Metadata = { title: 'Publicar vaga grátis em Rio Preto', description: 'Publique sua vaga em São José do Rio Preto e região e receba a arte pronta para postar, com QR Code e link de candidatura. Comece grátis.', alternates: { canonical: '/publicar' } };

export default async function Publicar({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const s = await searchParams;
  const u = await usuarioAtual();
  const destino = `/publicar${s.titulo ? `?titulo=${encodeURIComponent(s.titulo.slice(0, 80))}` : ''}`;
  let empresaNome: string | undefined;
  if (u?.empresaId) {
    const [e] = await (await banco()).select({ nome: empresas.nome }).from(empresas).where(eq(empresas.id, u.empresaId));
    empresaNome = e?.nome;
  }
  return (
    <>
      <Topo />
      <main>
        <Hero titulo="Publique sua vaga." cinza="A arte sai junto." texto="Cole o texto que você já usa ou preencha abaixo. A arte se desenha enquanto você escreve." />
        <Folha>
          <div className="secao embrulho">
            {!u ? (
              <div className="portao">
                <h2>Entre com a conta da empresa <em>para publicar.</em></h2>
                <p className="leve">Leva um minuto. Sua vaga, a arte e os candidatos ficam guardados no seu painel.</p>
                <div className="linha-botoes" style={{ justifyContent: 'center' }}>
                  <Link className="btn" href={`/criar-conta?tipo=contratante&destino=${encodeURIComponent(destino)}`}>Criar conta da empresa</Link>
                  <Link className="btn btn-claro" href={`/entrar?destino=${encodeURIComponent(destino)}`}>Já tenho conta</Link>
                </div>
              </div>
            ) : u.tipo === 'candidato' ? (
              <div className="portao"><h2>Esta é uma conta de candidato.</h2><p className="leve">Para publicar vagas, use uma conta de empresa.</p><div className="linha-botoes" style={{ justifyContent: 'center' }}><Link className="btn" href="/vagas">Ver vagas</Link></div></div>
            ) : (
              <FormPublicar logado empresaNome={empresaNome} inicial={{ titulo: s.titulo?.slice(0, 80), empresa: s.empresa?.slice(0, 80) }} link={`${URL_SITE}/vagas`} demo={SIMULADOR} />
            )}
          </div>
        </Folha>
      </main>
      <Rodape />
    </>
  );
}
