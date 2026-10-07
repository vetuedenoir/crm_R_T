import { err, ok, type Result } from '../result.js';

export interface SeedOptions {
  readonly reset: boolean;
}

const FLAGS = ['--reset', '--force'] as const;

// `argv` est la liste des arguments après le nom du script. Le seed efface des données avec `--reset` et
// écrit des données fictives : en production, il exige un `--force` explicite.
export function parseSeedArgs(
  argv: ReadonlyArray<string>,
  nodeEnv: string,
): Result<SeedOptions, string> {
  const unknown = argv.find((arg) => !FLAGS.some((flag) => flag === arg));
  if (unknown !== undefined) {
    return err(`Option inconnue : ${unknown} (options : ${FLAGS.join(', ')})`);
  }
  if (nodeEnv === 'production' && !argv.includes('--force')) {
    return err('Refus de lancer le seed en production sans --force');
  }
  return ok({ reset: argv.includes('--reset') });
}
