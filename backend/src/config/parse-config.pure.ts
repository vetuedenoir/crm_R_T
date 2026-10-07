import { err, ok, type Result } from '../result.js';

import { NODE_ENVS, type AppConfig, type NodeEnv, type RawEnv } from './app-config.js';

const DEFAULT_PORT = 3000;
const MAX_PORT = 65_535;
const DATABASE_PROTOCOLS: ReadonlyArray<string> = ['postgres:', 'postgresql:'];

function isNodeEnv(value: string): value is NodeEnv {
  return NODE_ENVS.some((env) => env === value);
}

function parseNodeEnv(raw: string | undefined): Result<NodeEnv, string> {
  const value = raw ?? 'development';
  return isNodeEnv(value)
    ? ok(value)
    : err(`NODE_ENV doit valoir ${NODE_ENVS.join(', ')} (reçu : "${value}")`);
}

function parsePort(raw: string | undefined): Result<number, string> {
  if (raw === undefined) {
    return ok(DEFAULT_PORT);
  }
  const port = /^\d+$/.test(raw) ? Number(raw) : NaN;
  return port >= 1 && port <= MAX_PORT
    ? ok(port)
    : err(`PORT doit être un entier entre 1 et ${String(MAX_PORT)} (reçu : "${raw}")`);
}

// Les messages ne reprennent jamais la valeur reçue : l'URL contient le mot de passe.
function parseDatabaseUrl(raw: string | undefined): Result<string, string> {
  if (raw === undefined || raw === '') {
    return err(
      'DATABASE_URL est obligatoire (ex. postgresql://utilisateur:mot-de-passe@hote:5432/base)',
    );
  }
  const protocol = URL.canParse(raw) ? new URL(raw).protocol : undefined;
  return protocol !== undefined && DATABASE_PROTOCOLS.includes(protocol)
    ? ok(raw)
    : err('DATABASE_URL doit être une URL postgres:// ou postgresql://');
}

function collectErrors(results: ReadonlyArray<Result<unknown, string>>): ReadonlyArray<string> {
  return results.flatMap((result) => (result.ok ? [] : [result.error]));
}

// Toutes les erreurs sont rapportées d'un coup : un démarrage raté ne doit pas demander N essais.
export function parseConfig(env: RawEnv): Result<AppConfig, ReadonlyArray<string>> {
  const nodeEnv = parseNodeEnv(env['NODE_ENV']);
  const port = parsePort(env['PORT']);
  const databaseUrl = parseDatabaseUrl(env['DATABASE_URL']);

  if (nodeEnv.ok && port.ok && databaseUrl.ok) {
    return ok({ nodeEnv: nodeEnv.value, port: port.value, databaseUrl: databaseUrl.value });
  }
  return err(collectErrors([nodeEnv, port, databaseUrl]));
}
