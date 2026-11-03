import { NextResponse, type NextRequest } from 'next/server';

// Só repassa o caminho pedido às telas que exigem conta, para que o login volte a ele.
// Não decide acesso: quem decide é exigirUsuario(), no servidor, com a sessão do banco.
export function proxy(req: NextRequest) {
  const cabecalhos = new Headers(req.headers);
  cabecalhos.set('x-caminho', `${req.nextUrl.pathname}${req.nextUrl.search}`);
  return NextResponse.next({ request: { headers: cabecalhos } });
}

export const config = { matcher: ['/painel/:path*', '/candidato/:path*', '/conversas/:path*', '/admin'] };
