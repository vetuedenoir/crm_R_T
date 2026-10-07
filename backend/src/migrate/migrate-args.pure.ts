import { err, ok, type Result } from '../result.js';

export type MigrateAction = 'up' | 'revert';

export interface MigrateOptions {
  readonly action: MigrateAction;
}

const FLAGS = ['--revert', '--force'] as const;

// `argv` est la liste des arguments après le nom du script. Sans option, on applique les migrations en
// attente. `--revert` défait la dernière : c'est destructif (tables, colonnes, données), donc en production
// il exige un `--force` explicite, comme le seed.
export function parseMigrateArgs(
  argv: ReadonlyArray<string>,
  nodeEnv: string,
): Result<MigrateOptions, string> {
  const unknown = argv.find((arg) => !FLAGS.some((flag) => flag === arg));
  if (unknown !== undefined) {
    return err(`Option inconnue : ${unknown} (options : ${FLAGS.join(', ')})`);
  }
  const action: MigrateAction = argv.includes('--revert') ? 'revert' : 'up';
  if (action === 'revert' && nodeEnv === 'production' && !argv.includes('--force')) {
    return err('Refus de défaire une migration en production sans --force');
  }
  return ok({ action });
}
