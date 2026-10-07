import type { ErrorDetail } from './schemas';

export type ApiErrorKind =
  'network' | 'validation' | 'not-found' | 'server' | 'rejected' | 'unexpected-response';

export interface ApiErrorInfo {
  readonly message: string;
  // Absents quand la panne ne vient pas d'une réponse de l'API (réseau coupé, réponse illisible).
  readonly status?: number;
  readonly code?: string;
  readonly requestId?: string;
  readonly cause?: unknown;
}

// Toute erreur de l'API ou du réseau est une `ApiError` : l'interface ne manipule jamais un `undefined`
// ou une exception anonyme (RULES §5). `kind` permet de les distinguer sans `instanceof`.
export class ApiError extends Error {
  readonly status: number | null;
  readonly code: string | null;
  readonly requestId: string | null;

  constructor(
    readonly kind: ApiErrorKind,
    info: ApiErrorInfo,
  ) {
    super(info.message, info.cause === undefined ? undefined : { cause: info.cause });
    this.name = 'ApiError';
    this.status = info.status ?? null;
    this.code = info.code ?? null;
    this.requestId = info.requestId ?? null;
  }
}

// Le serveur n'a pas pu être joint : connexion coupée, DNS, serveur éteint. Réessayer a un sens.
export class NetworkError extends ApiError {
  constructor(info: ApiErrorInfo) {
    super('network', info);
    this.name = 'NetworkError';
  }
}

// 422 : une valeur est refusée. `details` rattache chaque message à un champ (id de colonne).
export class ValidationApiError extends ApiError {
  constructor(
    info: ApiErrorInfo,
    readonly details: ReadonlyArray<ErrorDetail>,
  ) {
    super('validation', info);
    this.name = 'ValidationApiError';
  }

  messageFor(field: string): string | null {
    return this.details.find((detail) => detail.field === field)?.message ?? null;
  }
}

export class NotFoundError extends ApiError {
  constructor(info: ApiErrorInfo) {
    super('not-found', info);
    this.name = 'NotFoundError';
  }
}

export class ServerError extends ApiError {
  constructor(info: ApiErrorInfo) {
    super('server', info);
    this.name = 'ServerError';
  }
}

// Autres refus du serveur (400 tri/filtre invalide, 409 conflit) : la requête est à corriger, pas à rejouer.
export class RequestRejectedError extends ApiError {
  constructor(info: ApiErrorInfo) {
    super('rejected', info);
    this.name = 'RequestRejectedError';
  }
}

// Le serveur a répondu avec succès mais le corps ne respecte pas le contrat (schéma zod).
export class UnexpectedResponseError extends ApiError {
  constructor(info: ApiErrorInfo) {
    super('unexpected-response', info);
    this.name = 'UnexpectedResponseError';
  }
}
