import { generateContacts, type SeedContact } from './generate-contacts.pure.js';

export const SEED_COUNT = 1000;
// Graine fixe : deux seeds donnent exactement les mêmes contacts.
export const SEED_RANDOM_SEED = 20260101;

// Idempotence : la base doit finir avec `target` contacts. Les contacts déjà présents sont supposés être
// le début du jeu (même graine) ; on n'ajoute que la suite, donc relancer le seed n'ajoute rien.
export function pendingSeedContacts(
  target: number,
  existing: number,
  seed: number,
): ReadonlyArray<SeedContact> {
  return existing >= target ? [] : generateContacts(target, seed).slice(existing);
}
