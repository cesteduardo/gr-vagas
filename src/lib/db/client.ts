import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core';
import * as schema from './schema';

// Em produção, Postgres por DATABASE_URL. Sem ela, PGlite: um Postgres embutido
// que roda o projeto sem instalar nada na máquina.
export type Banco = PgDatabase<PgQueryResultHKT, typeof schema>;

const PASTA_MIGRACOES = resolve(/*turbopackIgnore: true*/ process.cwd(), 'drizzle');

export async function bancoEmMemoria(): Promise<Banco> {
  const { PGlite } = await import('@electric-sql/pglite');
  const { drizzle } = await import('drizzle-orm/pglite');
  const { migrate } = await import('drizzle-orm/pglite/migrator');
  const db = drizzle(new PGlite(), { schema });
  await migrate(db, { migrationsFolder: PASTA_MIGRACOES });
  return db as unknown as Banco;
}

async function abrir(): Promise<Banco> {
  const url = process.env.DATABASE_URL;
  if (url) {
    const { Pool } = await import('pg');
    const { drizzle } = await import('drizzle-orm/node-postgres');
    const { migrate } = await import('drizzle-orm/node-postgres/migrator');
    const db = drizzle(new Pool({ connectionString: url }), { schema });
    await migrate(db, { migrationsFolder: PASTA_MIGRACOES });
    return db as unknown as Banco;
  }
  if (process.env.NODE_ENV === 'production' && process.env.PERMITIR_PGLITE !== '1') {
    throw new Error('DATABASE_URL não definida em produção.');
  }
  const pasta = resolve(/*turbopackIgnore: true*/ process.cwd(), process.env.PASTA_DADOS ?? '.data/pg');
  mkdirSync(pasta, { recursive: true });
  const { PGlite } = await import('@electric-sql/pglite');
  const { drizzle } = await import('drizzle-orm/pglite');
  const { migrate } = await import('drizzle-orm/pglite/migrator');
  const db = drizzle(new PGlite(pasta), { schema });
  await migrate(db, { migrationsFolder: PASTA_MIGRACOES });
  return db as unknown as Banco;
}

// Global porque o Next recarrega módulos em desenvolvimento e abrir o PGlite
// duas vezes na mesma pasta corrompe os dados.
const g = globalThis as unknown as { __banco?: Promise<Banco> };

export function banco(): Promise<Banco> {
  g.__banco ??= abrir();
  return g.__banco;
}
