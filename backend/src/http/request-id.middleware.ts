import { randomUUID } from 'node:crypto';

import type { NextFunction, Request, Response } from 'express';

import { resolveRequestId } from './request-id.pure.js';

export const REQUEST_ID_HEADER = 'x-request-id';

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  res.setHeader(REQUEST_ID_HEADER, resolveRequestId(req.headers[REQUEST_ID_HEADER], randomUUID));
  next();
}
