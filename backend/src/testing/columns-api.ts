import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { DataSource } from 'typeorm';

import { ColumnsModule } from '../columns/index.js';

import { httpServer } from './http-server.js';
import { bodyOf } from './response-body.js';
import { startTestApp } from './test-app.js';

export interface ColumnBody {
  readonly id: string;
  readonly name: string;
  readonly type: string;
  readonly position: number;
}

function isColumnBody(value: unknown): value is ColumnBody {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    typeof value.id === 'string' &&
    'name' in value &&
    typeof value.name === 'string' &&
    'type' in value &&
    typeof value.type === 'string' &&
    'position' in value &&
    typeof value.position === 'number'
  );
}

export function columnOf(response: request.Response): ColumnBody {
  const body = bodyOf(response);
  if (!isColumnBody(body)) {
    throw new Error(`Corps inattendu : ${JSON.stringify(body)}`);
  }
  return body;
}

export function columnsOf(response: request.Response): ReadonlyArray<ColumnBody> {
  const body = bodyOf(response);
  if (!Array.isArray(body) || !body.every(isColumnBody)) {
    throw new Error(`Liste inattendue : ${JSON.stringify(body)}`);
  }
  return body;
}

// Application complète (même `configureApp` que la production) sur la base `crm_test`.
export interface ColumnsApi {
  readonly app: INestApplication;
  readonly dataSource: DataSource;
  server(): ReturnType<typeof httpServer>;
  create(name: string, type?: string): Promise<ColumnBody>;
  names(): Promise<ReadonlyArray<string>>;
}

export async function startColumnsApi(): Promise<ColumnsApi> {
  const { app, dataSource } = await startTestApp([ColumnsModule]);
  const server = (): ReturnType<typeof httpServer> => httpServer(app);
  return {
    app,
    dataSource,
    server,
    create: async (name, type = 'text') =>
      columnOf(await request(server()).post('/api/columns').send({ name, type }).expect(201)),
    names: async () =>
      columnsOf(await request(server()).get('/api/columns').expect(200)).map(
        (column) => column.name,
      ),
  };
}
