'use client';

import { BASE } from '@/lib/base';
import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { acaoEnviarMensagem } from '@/app/acoes';
import { formatarHora } from '@/lib/texto';

export type Msg = { id: string; texto: string; criadaEm: string; autorId: string };

export function Conversa({ id, minhaId, inicial }: { id: string; minhaId: string; inicial: Msg[] }) {
  const [msgs, setMsgs] = useState(inicial);
  const [texto, setTexto] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const fim = useRef<HTMLDivElement>(null);

  const atualizar = async () => {
    try {
      const r = await fetch(`${BASE}/api/conversas/${id}`, { cache: 'no-store' });
      if (r.ok) setMsgs(((await r.json()) as { mensagens: Msg[] }).mensagens);
    } catch {
      // A próxima volta tenta de novo.
    }
  };

  useEffect(() => {
    const t = setInterval(() => {
      if (document.visibilityState === 'visible') void atualizar();
    }, 5000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    const caixa = fim.current?.parentElement;
    if (caixa) caixa.scrollTop = caixa.scrollHeight;
  }, [msgs.length]);

  const enviar = async (e?: FormEvent) => {
    e?.preventDefault();
    if (!texto.trim() || enviando) {
      if (!texto.trim()) setErro('Escreva uma mensagem.');
      return;
    }
    setEnviando(true);
    setErro(null);
    try {
      const r = await acaoEnviarMensagem(id, texto);
      if (r.ok) {
        setTexto('');
        await atualizar();
      } else setErro(r.erro ?? 'Não foi possível enviar.');
    } catch {
      setErro('Não foi possível enviar. Verifique a conexão e tente de novo.');
    }
    setEnviando(false);
  };

  const tecla = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void enviar();
    }
  };

  return (
    <div className="conversa">
      <div className="mensagens" aria-live="polite">
        {msgs.length === 0 ? <p className="leve" style={{ margin: 'auto', textAlign: 'center' }}>Nenhuma mensagem ainda. Comece a conversa por aqui.</p> : null}
        {msgs.map((m) => (
          <div key={m.id} className={`msg${m.autorId === minhaId ? ' msg-minha' : ''}`}>
            {m.texto}
            <time dateTime={m.criadaEm}>{formatarHora(m.criadaEm)}</time>
          </div>
        ))}
        <div ref={fim} />
      </div>
      {erro ? <p className="erro" role="alert" style={{ padding: '8px 12px 0' }}>{erro}</p> : null}
      <form className="compor" onSubmit={enviar}>
        <label className="so-leitor" htmlFor="mensagem">Sua mensagem</label>
        <textarea id="mensagem" value={texto} maxLength={2000} placeholder="Escreva sua mensagem" onChange={(e) => setTexto(e.target.value)} onKeyDown={tecla} />
        <button className="btn" disabled={enviando}>Enviar</button>
      </form>
    </div>
  );
}
