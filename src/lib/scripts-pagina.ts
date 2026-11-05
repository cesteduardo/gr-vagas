// Scripts pequenos que rodam em toda página, fora do React.

// A faixa da barra de rolagem mostra o fundo do html, não o do herói. Passa a
// altura do herói para o CSS pintar o mesmo degradê atrás da barra.
export const ALTURA_HEROI = `(()=>{const d=document.documentElement;let a=-1;const m=()=>{const h=document.querySelector('.heroi');const n=h?Math.round(h.getBoundingClientRect().height):0;if(n!==a){a=n;d.style.setProperty('--heroi-h',n+'px');}};new ResizeObserver(m).observe(document.body);m();})()`;

// Toda parte que dobra (<details>) abre e fecha deslizando, em qualquer navegador.
// A altura vai da atual até a final, então um clique no meio do caminho volta suave.
const dobras = () => {
  const curva = 'cubic-bezier(.16,1,.3,1)';
  const anims = new WeakMap<HTMLDetailsElement, Animation>();
  document.addEventListener('click', (e) => {
    const s = (e.target as Element | null)?.closest?.('summary');
    const d = s?.parentElement;
    if (!s || !(d instanceof HTMLDetailsElement) || d.querySelector(':scope > summary') !== s) return;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    e.preventDefault();
    const abrindo = !d.open || d.dataset.fechando === '1';
    anims.get(d)?.cancel();
    const ini = d.getBoundingClientRect().height;
    d.open = true;
    delete d.dataset.fechando;
    d.style.height = '';
    let fim = d.getBoundingClientRect().height;
    if (!abrindo) {
      d.open = false;
      fim = d.getBoundingClientRect().height;
      d.open = true;
      d.dataset.fechando = '1';
    }
    d.style.overflow = 'clip';
    const a = d.animate({ height: [`${ini}px`, `${fim}px`] }, { duration: abrindo ? 420 : 300, easing: curva });
    anims.set(d, a);
    if (abrindo) {
      for (const filho of d.children) {
        if (filho === s) continue;
        (filho as HTMLElement).animate({ opacity: [0, 1], transform: ['translateY(-6px)', 'none'] }, { duration: 360, delay: 60, easing: curva, fill: 'backwards' });
      }
    }
    const acabar = () => {
      d.style.overflow = '';
      if (d.dataset.fechando === '1') { d.open = false; delete d.dataset.fechando; }
      anims.delete(d);
    };
    a.onfinish = acabar;
  });
};
export const DOBRAS = `(${dobras.toString()})()`;

// As duas de baixo mexem em atributos dos elementos, por isso rodam só depois da
// hidratação (componente ScriptsCliente); antes disso o React acusaria diferença.

// Caixa de texto que cresce com o que se escreve, onde o CSS field-sizing não chega (Firefox).
export const crescer = () => {
  if (CSS.supports('field-sizing', 'content')) return;
  const ajustar = (t: HTMLTextAreaElement) => {
    if (!t.isConnected || t.closest('.compor')) return;
    t.style.height = 'auto';
    t.style.height = `${Math.max(t.scrollHeight + 2, parseFloat(getComputedStyle(t).minHeight) || 0)}px`;
  };
  document.addEventListener('input', (e) => { if (e.target instanceof HTMLTextAreaElement) ajustar(e.target); });
  const todas = () => document.querySelectorAll('textarea').forEach((t) => ajustar(t as HTMLTextAreaElement));
  new MutationObserver(() => requestAnimationFrame(todas)).observe(document.body, { childList: true, subtree: true });
  // Preenchimento por botão ("Usar exemplo", texto colado) muda o valor sem evento de digitação.
  document.addEventListener('click', () => setTimeout(todas, 60));
  todas();
};

// Seções e cartões abaixo da dobra sobem de leve quando entram na tela; em grade,
// um depois do outro. O que já está visível ao abrir a página não se mexe.
export const revelar = () => {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) return;
  const ALVOS = '.secao-cabeca, .grade-onde > li, .grade-passos > li, .grade-planos > *, .faq details, .chamada, .cartoes > li, .grade-vagas > *, .painel-caixa, .form-cartao';
  const io = new IntersectionObserver((itens) => {
    for (const it of itens) {
      if (!it.isIntersecting) continue;
      const el = it.target as HTMLElement;
      el.dataset.r = '1';
      io.unobserve(el);
      // Depois de assentar, devolve as transições próprias do elemento (hover, sombra).
      setTimeout(() => { el.dataset.r = 'x'; el.style.removeProperty('--i'); }, 900 + Number(el.style.getPropertyValue('--i') || 0) * 70);
    }
  }, { rootMargin: '0px 0px -8% 0px' });
  const marcar = () => {
    document.querySelectorAll<HTMLElement>(ALVOS).forEach((el) => {
      if (el.dataset.r || el.closest('.heroi, .gaveta, .modal-legal, dialog')) return;
      const r = el.getBoundingClientRect();
      if (r.top < innerHeight) { el.dataset.r = 'x'; return; }
      const irmaos = el.parentElement ? [...el.parentElement.children].filter((x) => x.matches(ALVOS)) : [];
      el.style.setProperty('--i', String(Math.min(Math.max(0, irmaos.indexOf(el)), 5)));
      el.dataset.r = '0';
      io.observe(el);
    });
  };
  marcar();
  new MutationObserver(() => requestAnimationFrame(marcar)).observe(document.body, { childList: true, subtree: true });
};
