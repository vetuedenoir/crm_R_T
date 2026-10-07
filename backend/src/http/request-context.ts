import { AsyncLocalStorage } from 'node:async_hooks';

export interface RequestContext {
  readonly requestId: string;
}

// Permet au logger de retrouver le requestId de la requête en cours sans le passer à chaque appel.
export const requestContext = new AsyncLocalStorage<RequestContext>();
