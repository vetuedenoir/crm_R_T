import { Catch, Logger, type ArgumentsHost, type ExceptionFilter } from '@nestjs/common';
import type { Request, Response } from 'express';

import { translateError, type AppError } from '../errors/index.js';

import { toErrorBody } from './error-body.pure.js';
import { REQUEST_ID_HEADER } from './request-id.middleware.js';

const SERVER_ERROR_MIN = 500;
const UNKNOWN_REQUEST_ID = 'unknown';

// Seul endroit qui transforme une erreur en réponse HTTP : même forme pour toutes, aucun détail interne.
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();

    const error = translateError(exception);
    const header = response.getHeader(REQUEST_ID_HEADER);
    const requestId = typeof header === 'string' ? header : UNKNOWN_REQUEST_ID;

    this.log(exception, error, `${requestId} ${request.method} ${request.path}`);
    response.status(error.httpStatus).json(toErrorBody(error, requestId));
  }

  // 5xx : bug ou panne, on garde la stack de l'erreur d'origine. 4xx : faute du client, simple avertissement.
  private log(exception: unknown, error: AppError, context: string): void {
    const summary = `${context} -> ${String(error.httpStatus)} ${error.code}`;
    if (error.httpStatus >= SERVER_ERROR_MIN) {
      this.logger.error(summary, exception instanceof Error ? exception.stack : String(exception));
    } else {
      this.logger.warn(summary);
    }
  }
}
