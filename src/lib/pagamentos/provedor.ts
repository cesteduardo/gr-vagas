// O pagamento real entra aqui quando houver CNPJ e credenciais. Basta outro objeto
// com este formato, sem mudar telas nem regras de plano.
export type PedidoAssinatura = { usuarioId: string; plano: string };
export type EventoPagamento = { id: string; usuarioId: string; plano: string; tipo: 'pago'; fimEm: Date };

export interface ProvedorPagamento {
  nome: string;
  iniciar(pedido: PedidoAssinatura): Promise<{ evento: EventoPagamento } | { urlPagamento: string }>;
}
