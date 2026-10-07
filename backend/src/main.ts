import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module.js';
import { ConfigError, loadConfig } from './config/index.js';
import { configureApp } from './configure-app.js';
import { JsonLogger } from './logging/index.js';

async function bootstrap(): Promise<void> {
  const config = loadConfig();
  // `bufferLogs` : les logs de démarrage passent aussi par le logger JSON.
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(new JsonLogger());
  configureApp(app);
  // Sur SIGTERM/SIGINT : arrêt des écoutes, fin des requêtes en cours, fermeture des connexions.
  app.enableShutdownHooks();
  await app.listen(config.port);
}

bootstrap().catch((error: unknown) => {
  // Une configuration invalide est une erreur d'exploitation : message lisible, pas de stack.
  console.error(error instanceof ConfigError ? error.message : error);
  process.exitCode = 1;
});
