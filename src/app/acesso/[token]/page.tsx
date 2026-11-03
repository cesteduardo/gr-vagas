import type { Metadata } from 'next';
import Link from 'next/link';
import { acaoUsarLink } from '@/app/acoes';
import { Rodape, Topo } from '@/components/moldura';
import { linkValido } from '@/lib/auth/contas';
import { banco } from '@/lib/db/client';

export const metadata: Metadata = { title: 'Acessar conta', robots: { index: false, follow: false } };

// Exige um clique: leitores de e-mail abrem links sozinhos e gastariam um link de uso único.
export default async function Acesso({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const valido = await linkValido(await banco(), token);
  return (
    <>
      <Topo />
      <main className="pagina estreito">
        {valido ? (
          <>
            <header className="titulo-pagina"><h1>Tudo certo</h1><p>Clique para entrar na sua conta e confirmar o seu e-mail.</p></header>
            <form action={acaoUsarLink}><input type="hidden" name="token" value={token} /><button className="btn">Entrar na minha conta</button></form>
          </>
        ) : (
          <>
            <header className="titulo-pagina"><h1>Este link não vale mais</h1><p>Cada link funciona uma vez, por 1 hora. Peça um novo para entrar.</p></header>
            <Link className="btn" href="/entrar">Receber novo link</Link>
          </>
        )}
      </main>
      <Rodape />
    </>
  );
}
