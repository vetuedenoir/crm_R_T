import { Server } from 'node:http';

import type { INestApplication } from '@nestjs/common';

// `getHttpServer()` est typé `any` par Nest : on le prouve ici une fois pour toutes
// afin que les tests d'intégration n'héritent pas d'un `any`.
export function httpServer(app: INestApplication): Server {
  const server: unknown = app.getHttpServer();
  if (!(server instanceof Server)) {
    throw new Error("Le serveur HTTP de l'application n'est pas un http.Server");
  }
  // `instanceof` rétrécit vers `Server<any, any>` : les paramètres génériques sont ceux, par défaut, de Node.
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  return server;
}
