import { timingSafeEqual } from 'node:crypto';

// Asaas (docs.asaas.com): página de pagamento hospedada (Checkout) com Pix e cartão.
// Cada mês de plano, e cada impulso, é uma cobrança avulsa: o Pix não entra na
// recorrência automática do Checkout, e "sem fidelidade" fica literal.
// Chave em ASAAS_API_KEY; ASAAS_AMBIENTE=producao usa a conta real, qualquer outro valor o sandbox.

export const asaasLigado = () => Boolean(process.env.ASAAS_API_KEY?.trim());
const base = () => (process.env.ASAAS_AMBIENTE === 'producao' ? 'https://api.asaas.com/v3' : 'https://api-sandbox.asaas.com/v3');

// O Checkout pede uma imagem por item: um quadrado no azul do site, de 8 px.
const IMAGEM_ITEM = 'iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAIAAABLbSncAAAAEUlEQVR4nGPQyH+DFTEMLQkAnPNgwQln9kEAAAAASUVORK5CYII=';

export type PedidoCheckout = { referencia: string; nome: string; descricao: string; valor: number; voltaSucesso: string; voltaCancelado: string };
type Chamar = typeof fetch;

export async function criarCheckout(p: PedidoCheckout, chamar: Chamar = fetch): Promise<{ id: string; link: string }> {
  const r = await chamar(`${base()}/checkouts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', access_token: process.env.ASAAS_API_KEY ?? '', 'User-Agent': 'GR Vagas' },
    body: JSON.stringify({
      billingTypes: ['PIX', 'CREDIT_CARD'],
      chargeTypes: ['DETACHED'],
      minutesToExpire: 1440,
      externalReference: p.referencia.slice(0, 200),
      callback: { successUrl: p.voltaSucesso, cancelUrl: p.voltaCancelado, expiredUrl: p.voltaCancelado },
      items: [{ name: p.nome.slice(0, 30), description: p.descricao.slice(0, 150), quantity: 1, value: Math.round(p.valor * 100) / 100, imageBase64: IMAGEM_ITEM }],
    }),
  });
  const j = (await r.json().catch(() => ({}))) as { id?: string; link?: string; errors?: { description?: string }[] };
  if (!r.ok || !j.id || !j.link) throw new Error(`Asaas recusou a cobrança: ${j.errors?.map((e) => e.description).join('; ') || r.status}`);
  return { id: j.id, link: j.link };
}

/** O aviso só vale com o token configurado no Asaas, comparado em tempo constante. */
export function avisoAutentico(cabecalho: string | null): boolean {
  const esperado = process.env.ASAAS_WEBHOOK_TOKEN ?? '';
  if (esperado.length < 32 || !cabecalho) return false;
  const a = Buffer.from(cabecalho);
  const b = Buffer.from(esperado);
  return a.length === b.length && timingSafeEqual(a, b);
}

export type AvisoAsaas = { id?: string; event?: string; checkout?: { id?: string; externalReference?: string }; payment?: { id?: string; externalReference?: string; checkoutSession?: string; status?: string } };

// Pagamento confirmado: CHECKOUT_PAID, ou a cobrança confirmada/recebida. Devolve o que liga ao nosso pedido.
export function pagamentoDoAviso(a: AvisoAsaas): { evento: string; checkoutId?: string; referencia?: string } | null {
  if (!a.id || !a.event) return null;
  if (a.event === 'CHECKOUT_PAID') return { evento: a.id, checkoutId: a.checkout?.id, referencia: a.checkout?.externalReference };
  if (a.event === 'PAYMENT_CONFIRMED' || a.event === 'PAYMENT_RECEIVED') return { evento: a.id, checkoutId: a.payment?.checkoutSession, referencia: a.payment?.externalReference };
  return null;
}
