import { randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from 'node:crypto';

// scrypt do próprio Node: sem dependência nativa e resistente a força bruta.
// Parâmetros da OWASP para 16 MB de memória (N=2^14, r=8, p=5): cerca de 0,25 s por senha.
// Formato guardado: scrypt$N$r$p$sal$hash, com sal e hash em base64url. Como os parâmetros
// ficam no próprio hash, subir o custo depois não invalida as senhas já guardadas.
const N = 16384;
const R = 8;
const P = 5;
const TAMANHO = 32;

const derivar = (senha: string, sal: Buffer, n: number, r: number, p: number) =>
  new Promise<Buffer>((ok, falha) => {
    const opcoes: ScryptOptions = { N: n, r, p, maxmem: 64 * 1024 * 1024 };
    scrypt(senha.normalize('NFC'), sal, TAMANHO, opcoes, (erro, chave) => (erro ? falha(erro) : ok(chave)));
  });

export async function hashSenha(senha: string): Promise<string> {
  const sal = randomBytes(16);
  const chave = await derivar(senha, sal, N, R, P);
  return ['scrypt', N, R, P, sal.toString('base64url'), chave.toString('base64url')].join('$');
}

// Hash de mentira para conferir quando a conta não existe: o tempo de resposta
// fica igual e não revela quais e-mails têm conta.
let falso: Promise<string> | undefined;
export const hashFalso = () => (falso ??= hashSenha(randomBytes(12).toString('hex')));

export async function conferirSenha(senha: string, guardado: string | null | undefined): Promise<boolean> {
  const partes = (guardado ?? (await hashFalso())).split('$');
  if (partes.length !== 6 || partes[0] !== 'scrypt') return false;
  const [, n, r, p, sal, hash] = partes;
  const esperado = Buffer.from(hash!, 'base64url');
  if (esperado.length !== TAMANHO) return false;
  const chave = await derivar(senha, Buffer.from(sal!, 'base64url'), Number(n), Number(r), Number(p));
  return timingSafeEqual(chave, esperado) && Boolean(guardado);
}
