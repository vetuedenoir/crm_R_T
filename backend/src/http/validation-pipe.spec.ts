import { Body, Controller, Post, type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { IsInt, IsOptional, IsString, Max, MinLength } from 'class-validator';
import request from 'supertest';

import { configureApp } from '../configure-app.js';
import { httpServer } from '../testing/http-server.js';
import { bodyOf, errorFieldsOf } from '../testing/response-body.js';

class CreateThingDto {
  @IsString()
  @MinLength(2)
  readonly name!: string;

  @IsOptional()
  @IsInt()
  @Max(100)
  readonly limit?: number;
}

@Controller('things')
class ThingsController {
  @Post()
  create(@Body() dto: CreateThingDto): CreateThingDto {
    return dto;
  }
}

describe('ValidationPipe strict', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ controllers: [ThingsController] }).compile();
    app = moduleRef.createNestApplication({ logger: false });
    configureApp(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  function post(body: object): request.Test {
    return request(httpServer(app)).post('/api/things').send(body);
  }

  it('accepte un corps valide', async () => {
    await post({ name: 'Ada', limit: 10 }).expect(201, { name: 'Ada', limit: 10 });
  });

  it('refuse un champ inconnu, désigné par son nom', async () => {
    const response = await post({ name: 'Ada', admin: true }).expect(422);

    expect(bodyOf(response)).toMatchObject({ error: { code: 'VALIDATION_FAILED' } });
    expect(errorFieldsOf(response)).toEqual(['admin']);
  });

  it.each([
    ['un type incorrect', { name: 42 }, 'name'],
    ['une valeur trop courte', { name: 'A' }, 'name'],
    ['un champ obligatoire manquant', {}, 'name'],
    ['un nombre hors borne', { name: 'Ada', limit: 101 }, 'limit'],
    ['un nombre non entier', { name: 'Ada', limit: 1.5 }, 'limit'],
  ])('refuse %s avec un détail par champ', async (_cas, body, field) => {
    const response = await post(body).expect(422);

    expect(errorFieldsOf(response)).toEqual([field]);
  });
});
