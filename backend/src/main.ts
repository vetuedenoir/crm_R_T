import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module.js';
import { ConfigError, loadConfig } from './config/index.js';
import { configureApp } from './configure-app.js';

async function bootstrap(): Promise<void> {
  const config = loadConfig();
  const app = await NestFactory.create(AppModule);
  configureApp(app);
  await app.listen(config.port);
}

bootstrap().catch((error: unknown) => {
  // Une configuration invalide est une erreur d'exploitation : message lisible, pas de stack.
  console.error(error instanceof ConfigError ? error.message : error);
  process.exitCode = 1;
});
