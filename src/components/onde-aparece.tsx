import QRCode from 'qrcode';

// "Onde sua vaga aparece" em /anunciantes: cada cartão traz uma miniatura do
// lugar de verdade (carrossel, letreiro, busca, arte com QR), feita em código.

const SUA = 'Auxiliar de cozinha';

function Carrossel() {
  const cartoes = [
    { t: SUA, e: 'Sua empresa', s: 'R$ 1.900', sua: true },
    { t: 'Recepcionista', e: 'Clínica Norte', s: 'R$ 1.750' },
    { t: 'Atendente de loja', e: 'Casa Prado', s: 'R$ 1.680' },
  ];
  return (
    <div className="onde-palco onde-carrossel" aria-hidden="true">
      {cartoes.map((c) => (
        <div key={c.t} className={`onde-mini${c.sua ? ' onde-sua' : ''}`}>
          {c.sua && <span className="onde-selo">Destaque</span>}
          <b>{c.t}</b>
          <span>{c.e}</span>
          <small>{c.s}</small>
        </div>
      ))}
    </div>
  );
}

const EMPRESAS = ['Clínica Norte', 'Casa Prado', 'Sua empresa', 'Padaria Real', 'Auto Center Rio', 'Mercado Bom Dia', 'Studio Lume'];

function Letreiro() {
  const linha = (lista: string[], volta = false) => (
    <div className={`onde-trilho${volta ? ' onde-volta' : ''}`}>
      {[...lista, ...lista].map((n, i) => (
        <span key={i} className={`onde-logo${n === 'Sua empresa' ? ' onde-sua' : ''}`}>
          <i>{n.split(' ').map((p) => p[0]).slice(0, 2).join('')}</i>{n}
        </span>
      ))}
    </div>
  );
  return (
    <div className="onde-palco onde-letreiro" aria-hidden="true">
      {linha(EMPRESAS)}
      {linha([...EMPRESAS].reverse(), true)}
    </div>
  );
}

function Busca() {
  return (
    <div className="onde-palco onde-busca" aria-hidden="true">
      <div className="onde-campo"><svg viewBox="0 0 20 20" width="14" height="14"><circle cx="8.5" cy="8.5" r="5.5" fill="none" stroke="currentColor" strokeWidth="2" /><path d="m13 13 4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>cozinha</div>
      <div className="onde-chips"><span className="onde-ativo">Rio Preto</span><span>Mirassol</span><span>Bady Bassitt</span></div>
      <div className="onde-resultado onde-sua"><b>{SUA}</b><span>Sua empresa · Rio Preto</span></div>
      <div className="onde-resultado"><b>Cozinheiro</b><span>Padaria Real · Rio Preto</span></div>
    </div>
  );
}

async function Postar({ link }: { link: string }) {
  const qr = await QRCode.toString(link, { type: 'svg', margin: 0, color: { dark: '#0d1b3e', light: '#0000' } });
  return (
    <div className="onde-palco onde-postar" aria-hidden="true">
      <div className="onde-arte">
        <span>Vaga</span>
        <b>{SUA}</b>
        <small>Rio Preto · CLT</small>
        <div className="onde-qr" dangerouslySetInnerHTML={{ __html: qr }} />
      </div>
      <ul className="onde-canais">
        <li>Instagram</li>
        <li>Status</li>
        <li>Grupos</li>
        <li>Impressa</li>
      </ul>
    </div>
  );
}

export async function OndeAparece({ link }: { link: string }) {
  const itens = [
    { t: 'Carrossel de vagas', d: 'Na página inicial, na frente de quem entra procurando emprego. Vagas em destaque vêm primeiro.', palco: <Carrossel /> },
    { t: 'Letreiro de empresas', d: 'O nome e o logo da sua empresa passam na página inicial. Um toque leva às suas vagas.', palco: <Letreiro /> },
    { t: 'Busca e cidades', d: 'Na busca, na página da cidade e na página da sua empresa.', palco: <Busca /> },
    { t: 'Onde você postar', d: 'Instagram, Status, grupos e até impressa. O QR Code traz o candidato direto para você.', palco: <Postar link={link} /> },
  ];
  return (
    <ul className="grade-onde">
      {itens.map((i) => (
        <li key={i.t}>
          {i.palco}
          <div className="onde-texto"><h3>{i.t}</h3><p>{i.d}</p></div>
        </li>
      ))}
    </ul>
  );
}
