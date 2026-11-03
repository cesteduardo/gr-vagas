// O símbolo da GR Brands partido em duas metades, nas cores lavadas do GR Vagas.
export function Simbolo({ tamanho = 30 }: { tamanho?: number }) {
  return (
    <svg className="simbolo" viewBox="5 0 100 100" width={tamanho} height={tamanho} aria-hidden="true" focusable="false">
      <g transform="rotate(-22 55 50)">
        <path d="M22.12 47A38 38 0 0 1 97.88 47Z" fill="#7FAEE3" />
        <path d="M12.12 53A38 38 0 0 0 87.88 53Z" fill="#F79C6B" />
      </g>
    </svg>
  );
}

export function Palavra() {
  return <span className="palavra">GR Vagas<i>.</i></span>;
}
