import { randomUUID } from 'node:crypto';

import type { NextFunction, Request, Response } from 'express';

import { requestContext } from './request-context.js';
import { resolveRequestId } from './request-id.pure.js';

export const REQUEST_ID_HEADER = 'x-request-id';

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const requestId = resolveRequestId(req.headers[REQUEST_ID_HEADER], randomUUID);
  res.setHeader(REQUEST_ID_HEADER, requestId);
  requestContext.run({ requestId }, next);
}
