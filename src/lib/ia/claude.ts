import Anthropic from '@anthropic-ai/sdk';

export type ChamarIa = (d: { sistema: string; conteudo: Anthropic.Beta.BetaContentBlockParam[]; esquema: Record<string, unknown> }) => Promise<unknown | null>;

// Só existe com chave configurada. Sem ela, os leitores usam as regras locais.
export function iaDisponivel(): ChamarIa | null {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  const client = new Anthropic();
  return async ({ sistema, conteudo, esquema }) => {
    try {
      const r = await client.beta.messages.create({
        model: process.env.MODELO_IA_VAGAS || 'claude-opus-5-5',
        // O raciocínio do modelo conta neste teto: com folga, o JSON não sai cortado.
        max_tokens: 16000,
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default',
        system: sistema,
        output_config: { effort: 'low', format: { type: 'json_schema', schema: esquema } },
        messages: [{ role: 'user', content: conteudo }],
      } as Anthropic.Beta.MessageCreateParamsNonStreaming);
      if (r.stop_reason === 'refusal' || r.stop_reason === 'max_tokens') return null;
      const bloco = r.content.find((b) => b.type === 'text');
      return bloco && bloco.type === 'text' ? JSON.parse(bloco.text) : null;
    } catch (e) {
      if (e instanceof Anthropic.APIError) console.error(`Falha na IA (${e.status}):`, e.message);
      else console.error('Falha na IA:', e instanceof Error ? e.message : 'erro desconhecido');
      return null;
    }
  };
}
