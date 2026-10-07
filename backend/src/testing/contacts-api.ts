import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { DataSource } from 'typeorm';

import { ColumnsModule } from '../columns/index.js';
import { ContactsModule } from '../contacts/index.js';

import type { ColumnBody } from './columns-api.js';
import { httpServer } from './http-server.js';
import { bodyOf } from './response-body.js';
import { startTestApp } from './test-app.js';

export interface ContactBodyOf {
  readonly id: string;
  readonly cells: Readonly<Record<string, unknown>>;
}

export interface ContactsPageBody {
  readonly items: ReadonlyArray<ContactBodyOf>;
  readonly total: number;
  readonly offset: number;
  readonly limit: number;
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null;
}

function isContactBody(value: unknown): value is ContactBodyOf {
  return isRecord(value) && typeof value['id'] === 'string' && isRecord(value['cells']);
}

export function contactOf(response: request.Response): ContactBodyOf {
  const body = bodyOf(response);
  if (!isContactBody(body)) {
    throw new Error(`Corps inattendu : ${JSON.stringify(body)}`);
  }
  return body;
}

export function pageOf(response: request.Response): ContactsPageBody {
  const body = bodyOf(response);
  if (
    !isRecord(body) ||
    !Array.isArray(body['items']) ||
    !body['items'].every(isContactBody) ||
    typeof body['total'] !== 'number' ||
    typeof body['offset'] !== 'number' ||
    typeof body['limit'] !== 'number'
  ) {
    throw new Error(`Page inattendue : ${JSON.stringify(body)}`);
  }
  return {
    items: body['items'],
    total: body['total'],
    offset: body['offset'],
    limit: body['limit'],
  };
}

export interface ListOptions {
  readonly offset?: number;
  readonly limit?: number;
  readonly sort?: string;
  readonly filters?: ReadonlyArray<object>;
}

export interface ContactsApi {
  readonly app: INestApplication;
  readonly dataSource: DataSource;
  server(): ReturnType<typeof httpServer>;
  createColumn(name: string, type?: string): Promise<ColumnBody>;
  createContact(values?: Readonly<Record<string, unknown>>): Promise<ContactBodyOf>;
  list(options?: ListOptions): request.Test;
  // Requête brute, pour les paramètres que `list` ne sait pas construire (JSON invalide, paramètre inconnu).
  rawList(query: object): request.Test;
}

export async function startContactsApi(): Promise<ContactsApi> {
  const { app, dataSource } = await startTestApp([ColumnsModule, ContactsModule]);
  const server = (): ReturnType<typeof httpServer> => httpServer(app);
  return {
    app,
    dataSource,
    server,
    createColumn: async (name, type = 'text') => {
      const response = await request(server())
        .post('/api/columns')
        .send({ name, type })
        .expect(201);
      // Le corps est déjà validé par les tests des colonnes ; on ne garde que les champs utiles ici.
      const body = bodyOf(response);
      if (!isRecord(body) || typeof body['id'] !== 'string') {
        throw new Error(`Corps inattendu : ${JSON.stringify(body)}`);
      }
      return { id: body['id'], name, type, position: Number(body['position']) };
    },
    createContact: async (values = {}) =>
      contactOf(await request(server()).post('/api/contacts').send({ values }).expect(201)),
    rawList: (query) => request(server()).get('/api/contacts').query(query),
    list: ({ filters, ...rest } = {}) =>
      request(server())
        .get('/api/contacts')
        .query({ ...rest, ...(filters === undefined ? {} : { filters: JSON.stringify(filters) }) }),
  };
}
