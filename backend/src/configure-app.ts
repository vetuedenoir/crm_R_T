import type { INestApplication } from '@nestjs/common';

import { API_PREFIX } from './api-prefix.js';
import { AllExceptionsFilter, requestIdMiddleware } from './http/index.js';

// Partagé par `main.ts` et les tests d'intégration : ils doivent exercer la même application.
export function configureApp(app: INestApplication): void {
  app.setGlobalPrefix(API_PREFIX);
  app.use(requestIdMiddleware);
  app.useGlobalFilters(new AllExceptionsFilter());
}
