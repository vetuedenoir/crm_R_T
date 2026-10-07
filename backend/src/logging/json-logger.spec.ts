import { jest } from '@jest/globals';
import { Controller, Get, Logger, type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { configureApp } from '../configure-app.js';
import { httpServer } from '../testing/http-server.js';

import { JsonLogger } from './json-logger.js';

@Controller('hello')
class HelloController {
  private readonly logger = new Logger(HelloController.name);

  @Get()
  async hello(): Promise<{ readonly ok: true }> {
    // L'attente asynchrone vérifie que le requestId survit au-delà du premier tick.
    await new Promise((resolve) => setImmediate(resolve));
    this.logger.log('traitement');
    return { ok: true };
  }
}

describe('JsonLogger', () => {
  let app: INestApplication;
  let lines: string[];

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ controllers: [HelloController] }).compile();
    app = moduleRef.createNestApplication({ logger: false });
    configureApp(app);
    await app.init();
    // Après `init()` : les logs de démarrage de Nest n'intéressent pas ces tests.
    app.useLogger(new JsonLogger());
  });

  beforeEach(() => {
    lines = [];
    jest.spyOn(process.stdout, 'write').mockImplementation((chunk) => {
      lines.push(String(chunk));
      return true;
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  afterAll(async () => {
    await app.close();
  });

  it('journalise en JSON avec le requestId de la requête en cours', async () => {
    const response = await request(httpServer(app)).get('/api/hello').set('X-Request-Id', 'abc-1');

    const entry: unknown = JSON.parse(lines.join('').trim().split('\n').at(-1) ?? '');
    expect(response.status).toBe(200);
    expect(entry).toMatchObject({
      level: 'info',
      message: 'traitement',
      context: 'HelloController',
      requestId: 'abc-1',
    });
  });

  it('isole le requestId de deux requêtes simultanées', async () => {
    await Promise.all([
      request(httpServer(app)).get('/api/hello').set('X-Request-Id', 'req-a'),
      request(httpServer(app)).get('/api/hello').set('X-Request-Id', 'req-b'),
    ]);

    const ids = lines
      .join('')
      .trim()
      .split('\n')
      .map((line): unknown => JSON.parse(line))
      .flatMap((entry) =>
        typeof entry === 'object' && entry !== null && 'requestId' in entry
          ? [entry.requestId]
          : [],
      );
    expect([...ids].sort()).toEqual(['req-a', 'req-b']);
  });
});
