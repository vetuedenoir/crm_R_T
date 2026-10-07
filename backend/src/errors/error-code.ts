// NOT_FOUND (route inconnue) et BAD_REQUEST (requête mal formée, hors validation) couvrent les erreurs
// que le framework produit avant qu'une règle métier n'intervienne.
// Codes stables : ils font partie du contrat d'API, le front s'appuie dessus.
export const ERROR_CODES = [
  'VALIDATION_FAILED',
  'COLUMN_NOT_FOUND',
  'CONTACT_NOT_FOUND',
  'INVALID_FILTER',
  'INVALID_SORT',
  'NOT_FOUND',
  'BAD_REQUEST',
  'CONFLICT',
  'INTERNAL',
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

// `Record` exhaustif : ajouter un code sans son statut HTTP ne compile pas.
export const HTTP_STATUS_BY_CODE: Readonly<Record<ErrorCode, number>> = {
  VALIDATION_FAILED: 422,
  COLUMN_NOT_FOUND: 404,
  CONTACT_NOT_FOUND: 404,
  INVALID_FILTER: 400,
  INVALID_SORT: 400,
  NOT_FOUND: 404,
  BAD_REQUEST: 400,
  CONFLICT: 409,
  INTERNAL: 500,
};
