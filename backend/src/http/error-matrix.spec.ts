import { jest } from '@jest/globals';
import {
  Controller,
  ForbiddenException,
  Get,
  Logger,
  Param,
  ServiceUnavailableException,
  UnauthorizedException,
  type INestApplication,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { configureApp } from '../configure-app.js';
import { AppError, ERROR_CODES, HTTP_STATUS_BY_CODE } from '../errors/index.js';
import { httpServer } from '../testing/http-server.js';
import { bodyOf } from '../testing/response-body.js';

import { AllExceptionsFilter } from './all-exceptions.filter.js';

const SECRET = 'SELECT secret FROM cells -- /srv/app/dist/main.js';

function throwValue(value: unknown): never {
  // On vérifie justement qu'une valeur jetée qui n'est pas une `Error` est elle aussi traduite.

  throw value;
}

function errorWithStatus(status: number): Error {
  return Object.assign(new Error(SECRET), { status });
}

function pgError(code: string): Error {
  return Object.assign(new Error(SECRET), { code, severity: 'ERROR' });
}

// Chaque entrée est une façon réelle de rater : le contrôleur jette, le filtre doit répondre.
const FAILURES: Readonly<Record<string, () => never>> = {
  forbidden: () => throwValue(new ForbiddenException(SECRET)),
  unauthorized: () => throwValue(new UnauthorizedException(SECRET)),
  'http-503': () => throwValue(new ServiceUnavailableException(SECRET)),
  'express-413': () => throwValue(errorWithStatus(413)),
  'pg-invalid-text': () => throwValue(pgError('22P02')),
  'pg-foreign-key': () => throwValue({ driverError: pgError('23503') }),
  'pg-unmapped': () => throwValue(pgError('42P01')),
  'plain-error': () => throwValue(new Error(SECRET)),
  string: () => throwValue(SECRET),
  object: () => throwValue({ sql: SECRET }),
  null: () => throwValue(null),
};

@Controller('matrix')
class MatrixController {
  @Get('app/:code')
  app(@Param('code') code: string): never {
    const known = ERROR_CODES.find((candidate) => candidate === code);
    if (known === undefined) {
      throw new Error(`code inconnu : ${code}`);
    }
    throw new AppError(known, `message ${known}`, [{ field: 'f', message: 'm' }], {
      cause: new Error(SECRET),
    });
  }

  @Get('other/:kind')
  other(@Param('kind') kind: string): never {
    const fail = FAILURES[kind];
    if (fail === undefined) {
      throw new Error(`cas inconnu : ${kind}`);
    }
    return fail();
  }
}

async function createApp(setup: (app: INestApplication) => void): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({ controllers: [MatrixController] }).compile();
  const app = moduleRef.createNestApplication({ logger: false });
  setup(app);
  await app.init();
  return app;
}

describe('AllExceptionsFilter : chaque type d’erreur donne le bon statut et le bon corps', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createApp(configureApp);
  });

  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  afterAll(async () => {
    await app.close();
  });

  it.each(ERROR_CODES.map((code) => [code, HTTP_STATUS_BY_CODE[code]] as const))(
    'AppError %s → HTTP %i, avec son message et ses détails',
    async (code, status) => {
      const response = await request(httpServer(app)).get(`/api/matrix/app/${code}`).expect(status);

      expect(bodyOf(response)).toEqual({
        error: {
          code,
          message: `message ${code}`,
          details: [{ field: 'f', message: 'm' }],
          requestId: response.headers['x-request-id'],
        },
      });
    },
  );

  it.each([
    ['forbidden', 400, 'BAD_REQUEST', 'Requête invalide'],
    ['unauthorized', 400, 'BAD_REQUEST', 'Requête invalide'],
    ['express-413', 400, 'BAD_REQUEST', 'Requête invalide'],
    ['pg-invalid-text', 400, 'BAD_REQUEST', 'Une valeur a un format invalide'],
    ['pg-foreign-key', 409, 'CONFLICT', "L'opération référence une ressource inexistante"],
    ['http-503', 500, 'INTERNAL', 'Erreur interne du serveur'],
    ['pg-unmapped', 500, 'INTERNAL', 'Erreur interne du serveur'],
    ['plain-error', 500, 'INTERNAL', 'Erreur interne du serveur'],
    ['string', 500, 'INTERNAL', 'Erreur interne du serveur'],
    ['object', 500, 'INTERNAL', 'Erreur interne du serveur'],
    ['null', 500, 'INTERNAL', 'Erreur interne du serveur'],
  ])('%s → HTTP %i %s, message fixe et sans détail', async (kind, status, code, message) => {
    const response = await request(httpServer(app)).get(`/api/matrix/other/${kind}`).expect(status);

    expect(bodyOf(response)).toEqual({
      error: { code, message, details: [], requestId: response.headers['x-request-id'] },
    });
  });

  it("[sécurité] aucune réponse ne laisse fuir le SQL, un chemin, la cause ou la stack d'origine", async () => {
    const routes = [
      ...ERROR_CODES.map((code) => `/api/matrix/app/${code}`),
      ...Object.keys(FAILURES).map((kind) => `/api/matrix/other/${kind}`),
    ];

    // En séquence : supertest ouvre le serveur à chaque appel, en parallèle il dépasse la limite d'écouteurs.
    const bodies: string[] = [];
    for (const route of routes) {
      bodies.push(JSON.stringify(bodyOf(await request(httpServer(app)).get(route))));
    }

    expect(bodies).toHaveLength(ERROR_CODES.length + Object.keys(FAILURES).length);
    for (const body of bodies) {
      expect(body).not.toMatch(/SELECT|secret|\/srv\/|main\.js|\bat \w+|stack/i);
    }
  });
});

describe('AllExceptionsFilter sans middleware de requestId', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createApp((instance) => {
      instance.setGlobalPrefix('api');
      instance.useGlobalFilters(new AllExceptionsFilter());
    });
  });

  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  afterAll(async () => {
    await app.close();
  });

  it("répond quand même, avec le requestId 'unknown' plutôt que de planter", async () => {
    const response = await request(httpServer(app))
      .get('/api/matrix/other/plain-error')
      .expect(500);

    expect(bodyOf(response)).toMatchObject({ error: { code: 'INTERNAL', requestId: 'unknown' } });
  });
});
