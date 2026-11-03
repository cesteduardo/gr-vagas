import { formatarTelefone } from '@/lib/forms/validators';

// Para onde o QR Code leva e o que a arte diz sobre isso.
export function destinoDaArte(link: string, qr: string, whatsapp: string, titulo: string) {
  if (qr === 'whatsapp' && whatsapp) {
    return { qr: `https://wa.me/55${whatsapp}?text=${encodeURIComponent(`Olá! Vi a vaga de ${titulo} e tenho interesse.`)}`, link: formatarTelefone(whatsapp), cta: 'Aponte a câmera e chame no WhatsApp' };
  }
  // Na arte vai só o domínio: endereço longo ninguém digita, e o QR Code leva ao lugar certo.
  const dominio = link.replace(/^https?:\/\//, '').split('/')[0] ?? link;
  return { qr: link, link: dominio, cta: 'Aponte a câmera e candidate-se' };
}

// Os benefícios escritos na vaga viram os destaques da arte: curtos e no máximo três.
export function destaquesDe(beneficios: string): string[] {
  return beneficios
    .split(/\n|;|,|•|\s-\s/)
    .map((t) => t.replace(/^[-*•\s]+/, '').replace(/[.\s]+$/, '').trim())
    .filter((t) => t.length >= 2 && t.length <= 34)
    .slice(0, 3);
}
