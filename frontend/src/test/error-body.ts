export interface ErrorDetailBody {
  readonly field: string;
  readonly message: string;
}

// Corps d'erreur au format du backend (`ErrorBody`), pour simuler un refus de l'API.
export function errorBody(
  code: string,
  message: string,
  details: ReadonlyArray<ErrorDetailBody> = [],
): { error: { code: string; message: string; details: ErrorDetailBody[]; requestId: string } } {
  return { error: { code, message, details: [...details], requestId: 'req-1' } };
}
