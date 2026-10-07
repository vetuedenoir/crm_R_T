import type { AppError, ErrorCode, ErrorDetail } from '../errors/index.js';

export interface ErrorBody {
  readonly error: {
    readonly code: ErrorCode;
    readonly message: string;
    readonly details: ReadonlyArray<ErrorDetail>;
    readonly requestId: string;
  };
}

export function toErrorBody(error: AppError, requestId: string): ErrorBody {
  return {
    error: { code: error.code, message: error.message, details: error.details, requestId },
  };
}
