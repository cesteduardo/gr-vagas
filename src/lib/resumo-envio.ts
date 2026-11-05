import type { Cv } from '@/lib/curriculo';

// Frase depois de enviar o currículo: o que entrou no perfil e quantas vagas combinam agora.
// Sem nada do servidor: roda no navegador.
type Acrescimos = { titulo?: string; cidadeSlug?: string; resumo?: string; cv: Cv };

const conta = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;

export function resumoDoEnvio(a: Acrescimos | undefined, combinam: number | undefined): string {
  const partes = [
    a?.cv.habilidades?.length ? conta(a.cv.habilidades.length, 'habilidade', 'habilidades') : '',
    a?.cv.experiencias?.length ? conta(a.cv.experiencias.length, 'experiência', 'experiências') : '',
    a?.cv.formacao?.length ? conta(a.cv.formacao.length, 'formação', 'formações') : '',
    a?.cv.idiomas?.length ? conta(a.cv.idiomas.length, 'idioma', 'idiomas') : '',
    a?.titulo ? 'o seu cargo' : '',
  ].filter(Boolean);
  const lista = partes.length > 1 ? `${partes.slice(0, -1).join(', ')} e ${partes.at(-1)}` : partes[0];
  const inicio = lista ? `Currículo enviado. Entraram no seu perfil: ${lista}.` : 'Currículo enviado. O seu perfil já tinha tudo o que encontramos no arquivo.';
  const vagas = combinam ? ` ${combinam === 1 ? 'Agora 1 vaga combina' : `Agora ${combinam} vagas combinam`} com você.` : ' Por enquanto nenhuma vaga aberta combina com o seu perfil.';
  return inicio + vagas;
}
