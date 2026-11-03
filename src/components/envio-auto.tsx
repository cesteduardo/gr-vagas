'use client';

import type { ReactNode } from 'react';

export function EnvioAuto({ action, children }: { action: (f: FormData) => void | Promise<void>; children: ReactNode }) {
  return <form action={action} onChange={(e) => e.currentTarget.requestSubmit()}>{children}</form>;
}
