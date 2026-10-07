import { DataSource } from 'typeorm';

import { ConfigError, loadConfig } from '../config/index.js';
import { ENTITIES, MIGRATIONS } from '../persistence/index.js';

import { parseMigrateArgs } from './migrate-args.pure.js';
import { runMigrateAction } from './migrate-command.js';
import { describeMigrateFailure, describeMigrateReport } from './migrate-report.pure.js';

const CONNECTION_TIMEOUT_MS = 3000;
const INTERRUPTED_EXIT_CODE = 130;

// Une migration en cours ne s'interrompt pas à mi-chemin : le premier signal la laisse finir, puis la
// connexion se ferme normalement. Un second signal force l'arrêt ; PostgreSQL annule alors la transaction
// ouverte, la base reste dans l'état d'avant.
function installShutdownHandlers(): void {
  let interrupted = false;
  const onSignal = (signal: NodeJS.Signals): void => {
    if (interrupted) {
      console.error(
        `${signal} reçu à nouveau : arrêt immédiat, la transaction en cours est annulée.`,
      );
      process.exit(INTERRUPTED_EXIT_CODE);
    }
    interrupted = true;
    console.error(
      `${signal} reçu : fin de l'opération en cours, puis arrêt (renvoyer pour forcer).`,
    );
  };
  process.on('SIGINT', onSignal);
  process.on('SIGTERM', onSignal);
}

async function main(): Promise<void> {
  const config = loadConfig();
  const options = parseMigrateArgs(process.argv.slice(2), config.nodeEnv);
  if (!options.ok) {
    console.error(options.error);
    process.exitCode = 1;
    return;
  }
  installShutdownHandlers();
  const dataSource = new DataSource({
    type: 'postgres',
    url: config.databaseUrl,
    entities: ENTITIES,
    migrations: MIGRATIONS,
    synchronize: false,
    extra: { connectionTimeoutMillis: CONNECTION_TIMEOUT_MS },
  });
  await dataSource.initialize();
  try {
    const names = await runMigrateAction(dataSource, options.value.action);
    console.log(describeMigrateReport(options.value.action, names));
  } finally {
    await dataSource.destroy();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof ConfigError ? error.message : describeMigrateFailure(error));
  process.exitCode = 1;
});
