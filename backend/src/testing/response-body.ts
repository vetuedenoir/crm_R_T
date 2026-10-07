import type request from 'supertest';

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null;
}

// `response.body` est `any` côté supertest : on le traite comme `unknown` jusqu'à vérification.
export function bodyOf(response: request.Response): unknown {
  const body: unknown = response.body;
  return body;
}

// Champs désignés par les détails d'une réponse d'erreur, sans doublon.
export function errorFieldsOf(response: request.Response): ReadonlyArray<string> {
  const body = bodyOf(response);
  const details = isRecord(body) && isRecord(body['error']) ? body['error']['details'] : undefined;
  if (!Array.isArray(details)) {
    return [];
  }
  const fields = details.flatMap((detail: unknown) =>
    isRecord(detail) && typeof detail['field'] === 'string' ? [detail['field']] : [],
  );
  return [...new Set(fields)];
}
