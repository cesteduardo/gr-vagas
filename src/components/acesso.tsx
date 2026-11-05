import type { ReactNode } from 'react';
import { Simbolo } from './marca';

// Uma olhada no que tem depois de entrar: uma candidatura andando e a empresa respondendo.
// É ilustração, por isso fica escondida de leitor de tela.
function Vitrine() {
  const etapas = [
    { t: 'Enviada', estado: 'feita' },
    { t: 'Em análise', estado: 'feita' },
    { t: 'Entrevista', estado: 'agora' },
  ];
  return (
    <div className="acesso-vitrine">
      <div className="vitrine-cartao">
        <div className="vitrine-topo">
          <span className="vitrine-logo">ET</span>
          <div><b>Auxiliar de cozinha</b><small>Empresa Teste · Rio Preto</small></div>
        </div>
        <ol className="vitrine-etapas">
          {etapas.map((e) => <li key={e.t} className={`vitrine-${e.estado}`}>{e.t}</li>)}
        </ol>
      </div>
      <p className="vitrine-balao">Olá! Podemos conversar amanhã às 10h?</p>
    </div>
  );
}

// Moldura das telas de entrar e criar conta: um lado de boas-vindas, outro com o formulário.
export function Acesso({ titulo, cinza, itens, children }: { titulo: string; cinza: string; itens: string[]; children: ReactNode }) {
  return (
    <main className="pagina embrulho">
      <div className="acesso">
        <aside className="acesso-lado" aria-hidden="true">
          <Simbolo tamanho={44} />
          <div className="acesso-chamada">
            <p className="acesso-titulo">{titulo} <em>{cinza}</em></p>
            <ul>{itens.map((i) => <li key={i}>{i}</li>)}</ul>
          </div>
          <Vitrine />
        </aside>
        <div className="acesso-form">{children}</div>
      </div>
    </main>
  );
}
