import type { Result } from '../result.js';

// Extrait l'erreur d'un `Result` attendu en échec, pour l'inspecter champ par champ.
export function errorOf<T, E>(result: Result<T, E>): E {
  if (result.ok) {
    throw new Error('Un échec était attendu, mais le résultat est un succès');
  }
  return result.error;
}
