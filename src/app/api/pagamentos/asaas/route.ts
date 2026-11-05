import { NextResponse } from 'next/server';
import { registrarPagamento } from '@/lib/cobrancas';
import { banco } from '@/lib/db/client';
import { avisoAutentico, type AvisoAsaas } from '@/lib/pagamentos/asaas';

// Aviso de pagamento do Asaas (webhook). Configure no Asaas apontando para
// https://grbrands.com.br/vagas/api/pagamentos/asaas com o mesmo token de ASAAS_WEBHOOK_TOKEN.
export async function POST(req: Request) {
  if (!avisoAutentico(req.headers.get('asaas-access-token'))) return NextResponse.json({ erro: 'Não autorizado.' }, { status: 401 });
  let aviso: AvisoAsaas;
  try {
    aviso = (await req.json()) as AvisoAsaas;
  } catch {
    return NextResponse.json({ erro: 'Corpo inválido.' }, { status: 400 });
  }
  const resultado = await registrarPagamento(await banco(), aviso);
  // 200 sempre que o aviso foi lido: evento que não nos interessa não deve voltar na fila do Asaas.
  return NextResponse.json({ received: true, resultado });
}
