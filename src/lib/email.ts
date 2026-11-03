// Em demonstração o e-mail vai para o terminal. Em produção usa SMTP; se faltar
// configuração, falha de forma explícita, sem expor o conteúdo em log.
export type EnviarEmail = (para: string, assunto: string, corpo: string) => Promise<boolean>;

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
    const { createTransport } = await import('nodemailer');
    const porta = Number(process.env.SMTP_PORTA ?? 587);
    const transporte = createTransport({ host, port: porta, secure: porta === 465, auth: { user: process.env.SMTP_USUARIO, pass: process.env.SMTP_SENHA } });
    await transporte.sendMail({ from: process.env.EMAIL_REMETENTE, to: para, subject: assunto, text: corpo });
    return true;
  } catch (e) {
    console.error('Falha ao enviar e-mail:', e instanceof Error ? e.message : 'erro desconhecido');
    return false;
  }
};
