import { MutationCache, QueryClient } from '@tanstack/react-query';

import type { ApiError } from '../api';

import { retryDelay as defaultRetryDelay, shouldRetry } from './retry-policy.pure';

// Les erreurs de requête sont toujours des `ApiError` (voir `api-client.ts`).
declare module '@tanstack/react-query' {
  interface Register {
    defaultError: ApiError;
  }
}

export interface QueryClientOptions {
  // Appelé pour toute mutation en échec : c'est là que l'interface affiche un toast.
  readonly onMutationError: (error: unknown) => void;
  // Les tests passent `() => 0` pour ne pas attendre entre deux essais.
  readonly retryDelay?: (attemptIndex: number) => number;
}

export function createQueryClient({
  onMutationError,
  retryDelay,
}: QueryClientOptions): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: shouldRetry,
        retryDelay: retryDelay ?? defaultRetryDelay,
        // Évite de recharger les colonnes et la grille à chaque retour sur l'onglet.
        refetchOnWindowFocus: false,
      },
    },
    mutationCache: new MutationCache({ onError: onMutationError }),
  });
}
