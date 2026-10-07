import {
  ApiError,
  NotFoundError,
  RequestRejectedError,
  ServerError,
  ValidationApiError,
  type ApiErrorInfo,
} from './api-errors';
import { errorBodySchema, type ErrorDetail } from './schemas';

const HTTP_UNPROCESSABLE = 422;
const HTTP_NOT_FOUND = 404;
const HTTP_SERVER_ERROR = 500;

function fallbackMessage(status: number): string {
  return `Le serveur a répondu avec une erreur (HTTP ${String(status)})`;
}

// Un corps d'erreur absent ou hors contrat (page d'erreur de nginx, proxy coupé) ne doit pas masquer
// l'erreur elle-même : on retombe sur le statut HTTP.
function readInfo(status: number, body: unknown): { info: ApiErrorInfo; details: ErrorDetail[] } {
  const parsed = errorBodySchema.safeParse(body);
  if (!parsed.success) {
    return { info: { message: fallbackMessage(status), status }, details: [] };
  }
  const { code, message, requestId, details } = parsed.data.error;
  return { info: { message, status, code, requestId }, details: [...details] };
}

// Traduit une réponse HTTP en échec (statut hors 2xx) en erreur typée.
export function errorFromResponse(status: number, body: unknown): ApiError {
  const { info, details } = readInfo(status, body);
  if (status === HTTP_UNPROCESSABLE) {
    return new ValidationApiError(info, details);
  }
  if (status === HTTP_NOT_FOUND) {
    return new NotFoundError(info);
  }
  if (status >= HTTP_SERVER_ERROR) {
    return new ServerError(info);
  }
  return new RequestRejectedError(info);
}
