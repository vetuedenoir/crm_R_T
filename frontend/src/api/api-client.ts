import type { z } from 'zod';

import { ApiError, NetworkError, UnexpectedResponseError } from './api-errors';
import { errorFromResponse } from './error-from-response.pure';
import { buildApiUrl } from './url.pure';

type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

export interface RequestOptions {
  readonly method?: HttpMethod;
  readonly search?: URLSearchParams;
  readonly body?: unknown;
  // Fourni par TanStack Query : annule la requête quand la clé change ou que le composant disparaît.
  readonly signal?: AbortSignal;
}

function isAbort(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}

function toInit({ method, body, signal }: RequestOptions): RequestInit {
  return {
    method: method ?? 'GET',
    ...(body === undefined
      ? {}
      : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
    ...(signal === undefined ? {} : { signal }),
  };
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch (error: unknown) {
    // Corps vide ou non JSON : l'appelant décide s'il s'agit d'une erreur (réponse attendue) ou non.
    return { unreadable: String(error) };
  }
}

// Seul point d'appel réseau de l'application : toute panne en sort sous forme d'`ApiError`.
async function send(path: string, options: RequestOptions): Promise<Response> {
  const url = buildApiUrl(window.location.origin, path, options.search);
  let response: Response;
  try {
    response = await fetch(url, toInit(options));
  } catch (error: unknown) {
    if (isAbort(error)) {
      throw error;
    }
    throw new NetworkError({ message: 'Le serveur est injoignable', cause: error });
  }
  if (!response.ok) {
    throw errorFromResponse(response.status, await readJson(response));
  }
  return response;
}

// Une réponse n'est typée qu'après avoir franchi son schéma zod : sinon `UnexpectedResponseError`.
export async function apiRequest<T>(
  path: string,
  schema: z.ZodType<T>,
  options: RequestOptions = {},
): Promise<T> {
  const response = await send(path, options);
  const parsed = schema.safeParse(await readJson(response));
  if (!parsed.success) {
    throw new UnexpectedResponseError({
      message: `La réponse de ${path} ne respecte pas le contrat de l'API`,
      status: response.status,
      cause: parsed.error,
    });
  }
  return parsed.data;
}

// Pour les réponses sans corps (204).
export async function apiRequestNoContent(
  path: string,
  options: RequestOptions = {},
): Promise<void> {
  await send(path, options);
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}
