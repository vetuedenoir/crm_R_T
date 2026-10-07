import type { RawEnv } from '../config/app-config.js';

const DEFAULT_TEST_DB = 'crm_test';
const DEFAULT_DB_PORT = '5433';

// Les tests d'intégration visent toujours `crm_test`, jamais la base de développement :
// on reconstruit l'URL depuis les variables du `.env` plutôt que de réutiliser DATABASE_URL.
export function buildTestDatabaseUrl(env: RawEnv): string {
  const user = env['POSTGRES_USER'];
  const password = env['POSTGRES_PASSWORD'];
  if (user === undefined || password === undefined) {
    throw new Error(
      "POSTGRES_USER et POSTGRES_PASSWORD sont requis pour les tests d'intégration (copier .env.example en .env, puis `docker compose up -d db`)",
    );
  }
  const database = env['POSTGRES_TEST_DB'] ?? DEFAULT_TEST_DB;
  const port = env['DB_PORT'] ?? DEFAULT_DB_PORT;
  return `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@127.0.0.1:${port}/${database}`;
}
