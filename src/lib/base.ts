// Prefixo do site quando ele mora num subcaminho (grbrands.com.br/vagas). Vazio na raiz.
// Links do Next e redirect() já levam o prefixo sozinhos; isto é para fetch, <img>, <a> e <form> escritos à mão.
export const BASE = (process.env.NEXT_PUBLIC_CAMINHO_BASE ?? '').replace(/\/+$/, '');
