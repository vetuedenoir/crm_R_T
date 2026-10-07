import { HTTP_STATUS_BY_CODE, type ErrorCode } from './error-code.js';

// `field` désigne ce qui est en cause (id de colonne, nom de paramètre) pour que le client
// rattache le message à la bonne cellule ou au bon champ.
export interface ErrorDetail {
  readonly field: string;
  readonly message: string;
}

// Erreur métier attendue : le filtre global la traduit en réponse HTTP, sans rien exposer d'interne.
export class AppError extends Error {
  readonly httpStatus: number;

  constructor(
    readonly code: ErrorCode,
    message: string,
    readonly details: ReadonlyArray<ErrorDetail> = [],
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = 'AppError';
    this.httpStatus = HTTP_STATUS_BY_CODE[code];
  }
}
