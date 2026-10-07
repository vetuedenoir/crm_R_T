import { MigrationExecutor, type DataSource, type Migration } from 'typeorm';

import type { MigrateAction } from './migrate-args.pure.js';

// TypeORM défait la migration de plus grand horodatage : on nomme la même, pas la dernière insérée.
function latestByTimestamp(executed: ReadonlyArray<Migration>): Migration | undefined {
  return executed.reduce<Migration | undefined>(
    (latest, migration) =>
      latest === undefined || migration.timestamp > latest.timestamp ? migration : latest,
    undefined,
  );
}

// Noms des migrations jouées. `revert` n'en défait qu'une, la dernière appliquée : on peut ainsi reculer pas
// à pas, en relisant le résultat à chaque fois. Chaque appel est transactionnel : une migration qui échoue
// ne laisse rien derrière elle.
export async function runMigrateAction(
  dataSource: DataSource,
  action: MigrateAction,
): Promise<ReadonlyArray<string>> {
  if (action === 'up') {
    const applied = await dataSource.runMigrations({ transaction: 'all' });
    return applied.map((migration) => migration.name);
  }
  const latest = latestByTimestamp(await new MigrationExecutor(dataSource).getExecutedMigrations());
  if (latest === undefined) {
    return [];
  }
  await dataSource.undoLastMigration({ transaction: 'all' });
  return [latest.name];
}
