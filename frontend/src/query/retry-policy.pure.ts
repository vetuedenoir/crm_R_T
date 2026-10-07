import { isApiError } from '../api';

const MAX_RETRIES = 2;
const BASE_DELAY_MS = 1000;
const MAX_DELAY_MS = 8000;

// Seules les pannes passagères valent un nouvel essai : réseau coupé ou erreur serveur. Une erreur 4xx
// (mauvaise requête, introuvable, valeur refusée) donnerait la même réponse à chaque fois.
export function shouldRetry(failureCount: number, error: unknown): boolean {
  const transient = isApiError(error) && (error.kind === 'network' || error.kind === 'server');
  return transient && failureCount < MAX_RETRIES;
}

// Délai exponentiel (1 s, 2 s, 4 s...) plafonné. `attemptIndex` commence à 0.
export function retryDelay(attemptIndex: number): number {
  return Math.min(BASE_DELAY_MS * 2 ** attemptIndex, MAX_DELAY_MS);
}
