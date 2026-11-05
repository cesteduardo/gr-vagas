// IP de quem fez o pedido, para os limites de uso. Atrás de um proxy (Cloudflare,
// Render, Fly, Nginx) o cabeçalho confiável é o que o proxy grava; defina
// CABECALHO_IP com ele (ex.: cf-connecting-ip ou x-real-ip). Sem isso, vale o
// último item de x-forwarded-for, que é o que o proxy mais próximo acrescentou:
// o primeiro pode ser inventado por quem faz o pedido.
export function ipDe(h: Headers): string {
  const proprio = process.env.CABECALHO_IP?.trim().toLowerCase();
  if (proprio) {
    const v = h.get(proprio)?.split(',')[0]?.trim();
    if (v) return v.slice(0, 64);
  }
  const lista = h.get('x-forwarded-for')?.split(',').map((s) => s.trim()).filter(Boolean) ?? [];
  return (lista.at(-1) ?? h.get('x-real-ip') ?? 'local').slice(0, 64);
}
