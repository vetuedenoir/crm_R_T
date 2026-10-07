import type { MigrateAction } from './migrate-args.pure.js';

// Noms des migrations touchées par l'opération, dans l'ordre où elles ont été jouées.
export function describeMigrateReport(action: MigrateAction, names: ReadonlyArray<string>): string {
  if (names.length === 0) {
    return action === 'up' ? 'Aucune migration en attente.' : 'Aucune migration à défaire.';
  }
  const verb = action === 'up' ? 'appliquée(s)' : 'défaite(s)';
  return [
    `${String(names.length)} migration(s) ${verb} :`,
    ...names.map((name) => `  - ${name}`),
  ].join('\n');
}

function hasCode(error: Error): error is Error & { readonly code: string } {
  return 'code' in error && typeof error.code === 'string';
}

// Une panne de connexion ne doit pas déverser la pile de `pg` dans le terminal. Certaines erreurs réseau
// (`AggregateError` quand localhost résout en IPv4 et IPv6) ont un message vide : le code les identifie.
export function describeMigrateFailure(error: unknown): string {
  if (!(error instanceof Error)) {
    return `Échec de la migration : ${String(error)}`;
  }
  const reason = error.message === '' && hasCode(error) ? error.code : error.message;
  return `Échec de la migration : ${reason === '' ? error.name : reason}`;
}
