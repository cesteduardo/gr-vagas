'use client';

import { useEffect } from 'react';
import { crescer, revelar } from '@/lib/scripts-pagina';

// Liga, depois da hidratação, os scripts que marcam elementos da página.
let ligado = false;
export function ScriptsCliente() {
  useEffect(() => {
    if (ligado) return;
    ligado = true;
    crescer();
    revelar();
  }, []);
  return null;
}
