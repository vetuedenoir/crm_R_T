import { jest } from '@jest/globals';
import { Body, Controller, Get, Logger, Post, type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { configureApp } from '../configure-app.js';
import { AppError } from '../errors/index.js';
import { httpServer } from '../testing/http-server.js';
import { bodyOf } from '../testing/response-body.js';

@Controller('boom')
class BoomController {
  @Get('app')
  appError(): never {
    throw new AppError('VALIDATION_FAILED', 'Valeur invalide', [
      { field: 'c1', message: 'trop long' },
    ]);
  }

  @Get('unexpected')
  unexpected(): never {
    throw new Error('SELECT secret FROM cells WHERE password = 1');
  }

  @Get('pg')
  pg(): never {
    throw Object.assign(new Error('duplicate key value violates "cells_pkey"'), {
      code: '23505',
      severity: 'ERROR',
    });
  }

  @Post('echo')
  echo(@Body() body: unknown): unknown {
    return body;
  }
}

describe('AllExceptionsFilter', () => {
  let app: INestApplication;
  let warn: jest.SpiedFunction<Logger['warn']>;
  let error: jest.SpiedFunction<Logger['error']>;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ controllers: [BoomController] }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
  });

  beforeEach(() => {
    warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    error = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  afterAll(async () => {
    await app.close();
  });

  it('traduit une AppError en réponse uniforme avec son statut et ses détails', async () => {
    const response = await request(httpServer(app)).get('/api/boom/app').expect(422);

    expect(bodyOf(response)).toEqual({
      error: {
        code: 'VALIDATION_FAILED',
        message: 'Valeur invalide',
        details: [{ field: 'c1', message: 'trop long' }],
        requestId: response.headers['x-request-id'],
      },
    });
  });

  it("[sécurité] une erreur inattendue donne un 500 sans fuite d'information", async () => {
    const response = await request(httpServer(app)).get('/api/boom/unexpected').expect(500);

    expect(bodyOf(response)).toMatchObject({
      error: {
        code: 'INTERNAL',
        message: 'Erreur interne du serveur',
      },
    });
    expect(JSON.stringify(response.body)).not.toMatch(/SELECT|secret|password|stack/i);
  });

  it('traduit une erreur PostgreSQL en 409', async () => {
    const response = await request(httpServer(app)).get('/api/boom/pg').expect(409);

    expect(bodyOf(response)).toMatchObject({ error: { code: 'CONFLICT' } });
    expect(JSON.stringify(response.body)).not.toContain('cells_pkey');
  });

  it('répond NOT_FOUND pour une route inconnue', async () => {
    const response = await request(httpServer(app)).get('/api/inconnue').expect(404);

    expect(bodyOf(response)).toMatchObject({ error: { code: 'NOT_FOUND', details: [] } });
  });

  it('répond BAD_REQUEST pour un corps JSON mal formé', async () => {
    const response = await request(httpServer(app))
      .post('/api/boom/echo')
      .set('Content-Type', 'application/json')
      .send('{pas du json')
      .expect(400);

    expect(bodyOf(response)).toMatchObject({ error: { code: 'BAD_REQUEST' } });
  });

  it("journalise le chemin complet d'une route inconnue, préfixe compris", async () => {
    await request(httpServer(app)).get('/api/inconnue');

    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('GET /api/inconnue -> 404 NOT_FOUND'),
    );
  });

  it('reprend le X-Request-Id du client dans la réponse et le corps', async () => {
    const response = await request(httpServer(app))
      .get('/api/boom/app')
      .set('X-Request-Id', 'client-42');

    expect(response.headers['x-request-id']).toBe('client-42');
    expect(bodyOf(response)).toMatchObject({ error: { requestId: 'client-42' } });
  });

  it('journalise les 4xx en warn et les 5xx en error avec la stack', async () => {
    await request(httpServer(app)).get('/api/boom/app');
    await request(httpServer(app)).get('/api/boom/unexpected');

    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('GET /api/boom/app -> 422 VALIDATION_FAILED'),
    );
    expect(error).toHaveBeenCalledTimes(1);
    expect(error).toHaveBeenCalledWith(
      expect.stringContaining('-> 500 INTERNAL'),
      expect.stringContaining('Error: SELECT secret'),
    );
  });
});
