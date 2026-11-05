// Tarefas de hora em hora, dentro do próprio servidor:
// - faxina: apaga sessões e links vencidos e tentativas antigas (sempre ligada);
// - alertas de vaga por e-mail: ligam sozinhos na demonstração; em produção só com
//   ALERTAS_AUTOMATICOS=1, e aí não agende também o POST /api/cron/alertas, senão
//   o e-mail sai duas vezes.
const HORA_MS = 60 * 60 * 1000;
const PRIMEIRA_RODADA_MS = 60 * 1000;

type Agenda = { relogio?: ReturnType<typeof setInterval>; rodando: boolean };
const global_ = globalThis as typeof globalThis & { __tarefasGrVagas?: Agenda };

// Configuração de produção que falta aparece logo no log da partida.
function conferirProducao(simulador: boolean) {
  if (process.env.NODE_ENV !== 'production' || simulador) return;
  const faltas = [
    !process.env.DATABASE_URL && 'DATABASE_URL (Postgres)',
    !process.env.NEXT_PUBLIC_SITE_URL?.startsWith('https://') && 'NEXT_PUBLIC_SITE_URL com https://',
    !process.env.SMTP_HOST && 'SMTP_HOST (e-mail dos links)',
    !process.env.EMAIL_REMETENTE && 'EMAIL_REMETENTE',
    !process.env.CABECALHO_IP && 'CABECALHO_IP (IP real atrás do proxy)',
  ].filter(Boolean);
  if (faltas.length) console.error(`[produção] falta configurar: ${faltas.join(', ')}.`);
}

export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  const { SIMULADOR } = await import('@/lib/config');
  conferirProducao(SIMULADOR);
  if (global_.__tarefasGrVagas) return;
  const alertas = process.env.ALERTAS_AUTOMATICOS === '1' || (SIMULADOR && process.env.ALERTAS_AUTOMATICOS !== '0');

  const agenda: Agenda = { rodando: false };
  global_.__tarefasGrVagas = agenda;

  const rodar = async () => {
    if (agenda.rodando) return;
    agenda.rodando = true;
    try {
      const [{ banco }, { limparVencidos }] = await Promise.all([import('@/lib/db/client'), import('@/lib/auth/contas')]);
      const db = await banco();
      await limparVencidos(db);
      if (alertas) {
        const { enviarAlertas } = await import('@/lib/perfis');
        const enviados = await enviarAlertas(db);
        console.info(`[alertas] rodada das ${new Date().toLocaleTimeString('pt-BR')}: ${enviados} enviado(s).`);
        const { avisarRenovacoes } = await import('@/lib/cobrancas');
        const lembretes = await avisarRenovacoes(db);
        if (lembretes) console.info(`[planos] ${lembretes} lembrete(s) de renovação.`);
      }
    } catch (e) {
      console.error('[tarefas] falha na rodada:', e instanceof Error ? e.message : 'erro desconhecido');
    } finally {
      agenda.rodando = false;
    }
  };

  setTimeout(rodar, PRIMEIRA_RODADA_MS).unref();
  agenda.relogio = setInterval(rodar, HORA_MS);
  agenda.relogio.unref();
  console.info(`[tarefas] faxina${alertas ? ' e alertas' : ''} de hora em hora; a primeira rodada sai em 1 minuto.`);
}
