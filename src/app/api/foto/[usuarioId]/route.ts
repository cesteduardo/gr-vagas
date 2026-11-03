import { usuarioAtual } from '@/lib/auth/sessao';
import { banco } from '@/lib/db/client';
import { respostaImagem } from '@/lib/imagem-enviada';
import { fotoParaVer } from '@/lib/perfis';

// A foto do candidato não é pública: só quem já pode ver o currículo dele.
export async function GET(_: Request, { params }: { params: Promise<{ usuarioId: string }> }) {
  const u = await usuarioAtual();
  const { usuarioId } = await params;
  if (!u || !/^[0-9a-f-]{36}$/i.test(usuarioId)) return new Response(null, { status: 404 });
  const f = await fotoParaVer(await banco(), u.id, usuarioId);
  if (!f) return new Response(null, { status: 404 });
  return respostaImagem(f.foto, f.mime, 'private, max-age=300');
}
