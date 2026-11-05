import type { Transporter } from 'nodemailer';

// Em demonstração o e-mail vai para o terminal. Em produção usa SMTP com TLS
// obrigatório; se faltar configuração, falha de forma explícita, sem expor o
// conteúdo (que pode ter link de acesso) em log.
export type EnviarEmail = (para: string, assunto: string, corpo: string) => Promise<boolean>;

let transporte: Transporter | null = null;
async function abrirTransporte(host: string): Promise<Transporter> {
  if (transporte) return transporte;
  const { createTransport } = await import('nodemailer');
  const porta = Number(process.env.SMTP_PORTA ?? 587);
  transporte = createTransport({
    host,
    port: porta,
    secure: porta === 465, // 465 já abre em TLS; 587 sobe para TLS e não aceita ficar sem
    requireTLS: porta !== 465,
    tls: { minVersion: 'TLSv1.2' },
    auth: { user: process.env.SMTP_USUARIO, pass: process.env.SMTP_SENHA },
    pool: true, // reaproveita a conexão quando muita gente pede link ao mesmo tempo
    maxConnections: 3,
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
  });
  return transporte;
}

const escapar = (t: string) => t.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

// Versão em HTML simples, com o link de acesso virando botão. Sem imagens nem
// rastreio: e-mail leve cai menos em spam.
function html(corpo: string): string {
  const linhas = escapar(corpo).split('\n').map((l) => {
    const url = l.match(/^(https:\/\/\S+\/acesso\/[A-Za-z0-9_-]+)$/)?.[1];
    if (url) return `<p style="margin:24px 0"><a href="${url}" style="display:inline-block;padding:12px 22px;border-radius:999px;background:#286fec;color:#fff;font-weight:600;text-decoration:none">Entrar no GR Vagas</a></p><p style="font-size:12px;color:#7a8496">Se o botão não abrir, copie este endereço: ${url}</p>`;
    return l ? `<p style="margin:0 0 12px">${l}</p>` : '';
  });
  return `<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.5;color:#141a24;max-width:520px">${linhas.join('')}<p style="margin-top:28px;font-size:12px;color:#7a8496">GR Vagas · São José do Rio Preto e região</p></div>`;
}

export const enviarEmail: EnviarEmail = async (para, assunto, corpo) => {
  const host = process.env.SMTP_HOST;
  if (!host) {
    if (process.env.NODE_ENV !== 'production' || process.env.SIMULADOR === '1') {
      console.info(`[e-mail simulado] para ${para}: ${assunto}\n${corpo}`);
      return true;
    }
    console.error('Envio de e-mail não configurado: defina SMTP_HOST.');
    return false;
  }
  try {
    const t = await abrirTransporte(host);
    await t.sendMail({
      from: process.env.EMAIL_REMETENTE,
      replyTo: process.env.EMAIL_RESPOSTA || undefined,
      to: para,
      subject: assunto,
      text: corpo,
      html: html(corpo),
      headers: { 'Auto-Submitted': 'auto-generated', 'X-Auto-Response-Suppress': 'All' },
    });
    return true;
  } catch (e) {
    console.error('Falha ao enviar e-mail:', e instanceof Error ? e.message : 'erro desconhecido');
    return false;
  }
};
