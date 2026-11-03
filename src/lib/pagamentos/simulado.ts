import { randomUUID } from 'node:crypto';
import type { ProvedorPagamento } from './provedor';

const MES_MS = 30 * 24 * 60 * 60 * 1000;

export const provedorSimulado: ProvedorPagamento = {
  nome: 'simulado',
  async iniciar({ usuarioId, plano }) {
    return { evento: { id: `sim-${randomUUID()}`, usuarioId, plano, tipo: 'pago', fimEm: new Date(Date.now() + MES_MS) } };
  },
};
