import { and, eq, gt } from 'drizzle-orm';
import { LIMITES, planosDoTipo, SIMULADOR, type Limites, type PlanoId } from '@/lib/config';
import { ARTE_PADRAO, CHAMADAS, corValida, FONTES, FORMATOS, MODELOS, MODELOS_ANTIGOS } from '@/lib/arte/modelos';
import { normalizarTelefone, telefoneValido } from '@/lib/forms/validators';
import { revisarTexto } from '@/lib/moderacao';
import type { Banco } from '@/lib/db/client';
import { assinaturas, eventosPagamento, usuarios, type ConfigArte } from '@/lib/db/schema';
import type { EventoPagamento, ProvedorPagamento } from './pagamentos/provedor';
import { abrirCobrancaPlano } from '@/lib/cobrancas';
import { asaasLigado } from '@/lib/pagamentos/asaas';
import { provedorSimulado } from './pagamentos/simulado';

export const limites = (plano: PlanoId): Limites => LIMITES[plano];

export async function planoDe(db: Banco, usuarioId: string, agora = new Date()): Promise<PlanoId> {
  const [a] = await db.select({ plano: assinaturas.plano }).from(assinaturas).where(and(eq(assinaturas.usuarioId, usuarioId), gt(assinaturas.fimEm, agora)));
  return (a?.plano as PlanoId | undefined) ?? 'gratis';
}

// O navegador pode mandar qualquer coisa: o servidor só guarda o que existe de verdade.
const foco = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? Math.min(100, Math.max(0, Math.round(v))) : 50);

export function arteValida(pedido: Partial<ConfigArte> | undefined): ConfigArte {
  const p = pedido ?? {};
  const cor = (v: string | undefined, padrao: string) => (v && corValida(v) ? v.toUpperCase() : padrao);
  const whatsapp = normalizarTelefone(p.whatsapp ?? '');
  return {
    modelo: MODELOS.find((m) => m.id === (MODELOS_ANTIGOS[p.modelo ?? ''] ?? p.modelo))?.id ?? ARTE_PADRAO.modelo,
    formato: FORMATOS.find((f) => f.id === p.formato)?.id ?? ARTE_PADRAO.formato,
    fundo: cor(p.fundo, ARTE_PADRAO.fundo),
    destaque: cor(p.destaque, ARTE_PADRAO.destaque),
    texto: cor(p.texto, ARTE_PADRAO.texto),
    fonte: FONTES.find((f) => f.id === p.fonte)?.id ?? ARTE_PADRAO.fonte,
    chamada: CHAMADAS.find((c) => c === p.chamada) ?? ARTE_PADRAO.chamada,
    qr: p.qr === 'whatsapp' && telefoneValido(whatsapp) ? 'whatsapp' : 'vaga',
    qrEstilo: p.qrEstilo === 'pontos' ? 'pontos' : 'suave',
    whatsapp: telefoneValido(whatsapp) ? whatsapp : '',
    alinhamento: p.alinhamento === 'centro' ? 'centro' : 'esquerda',
    posicao: p.posicao === 'topo' || p.posicao === 'meio' ? p.posicao : 'base',
    focoX: foco(p.focoX),
    focoY: foco(p.focoY),
    ...(typeof p.tituloArte === 'string' && p.tituloArte.trim() && !revisarTexto(p.tituloArte) ? { tituloArte: p.tituloArte.trim().slice(0, 80) } : {}),
    ...(Array.isArray(p.destaques) ? { destaques: p.destaques.filter((d): d is string => typeof d === 'string').map((d) => d.trim().slice(0, 34)).filter((d) => d && !revisarTexto(d)).slice(0, 3) } : {}),
  };
}

export async function aplicarEvento(db: Banco, e: EventoPagamento): Promise<boolean> {
  return db.transaction(async (tx) => {
    const [novo] = await tx.insert(eventosPagamento).values({ id: e.id }).onConflictDoNothing().returning({ id: eventosPagamento.id });
    if (!novo) return false;
    await tx
      .insert(assinaturas)
      .values({ usuarioId: e.usuarioId, plano: e.plano, estado: 'ativa', provedor: 'simulado', fimEm: e.fimEm })
      .onConflictDoUpdate({ target: assinaturas.usuarioId, set: { plano: e.plano, estado: 'ativa', fimEm: e.fimEm } });
    return true;
  });
}

export function provedorAtivo(): ProvedorPagamento | null {
  return SIMULADOR ? provedorSimulado : null;
}

export async function assinar(db: Banco, usuarioId: string, plano: string, provedor = provedorAtivo()): Promise<{ ok: true; url?: string } | { ok: false; erro: string }> {
  const [u] = await db.select({ tipo: usuarios.tipo }).from(usuarios).where(eq(usuarios.id, usuarioId));
  if (!u) return { ok: false, erro: 'Conta não encontrada.' };
  const valido = planosDoTipo(u.tipo).some((p) => p.id === plano && p.preco > 0);
  if (!valido) return { ok: false, erro: 'Este plano não existe para a sua conta.' };
  // Com a chave do Asaas, cada mês é uma página de pagamento com Pix ou cartão.
  if (asaasLigado()) {
    try {
      return { ok: true, url: await abrirCobrancaPlano(db, usuarioId, plano) };
    } catch (e) {
      console.error('[asaas] cobrança do plano', e instanceof Error ? e.message : e);
      return { ok: false, erro: 'Não foi possível abrir o pagamento agora. Tente de novo em instantes.' };
    }
  }
  if (!provedor) return { ok: false, erro: 'A assinatura ainda não está disponível.' };
  const r = await provedor.iniciar({ usuarioId, plano });
  if ('urlPagamento' in r) return { ok: true, url: r.urlPagamento };
  await aplicarEvento(db, r.evento);
  return { ok: true };
}

// Cancelar mantém o que já foi pago até o fim do período.
export async function cancelar(db: Banco, usuarioId: string): Promise<void> {
  await db.update(assinaturas).set({ estado: 'cancelada' }).where(eq(assinaturas.usuarioId, usuarioId));
}

export async function assinaturaDe(db: Banco, usuarioId: string) {
  const [a] = await db.select().from(assinaturas).where(eq(assinaturas.usuarioId, usuarioId));
  return a ?? null;
}
