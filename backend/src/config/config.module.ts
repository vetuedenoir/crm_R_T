import { Global, Module } from '@nestjs/common';

import { loadConfig } from './load-config.js';

export const APP_CONFIG = Symbol('APP_CONFIG');

// Global : la configuration est lue une fois et injectable partout, sans réimporter le module.
@Global()
@Module({
  providers: [{ provide: APP_CONFIG, useFactory: () => loadConfig() }],
  exports: [APP_CONFIG],
})
export class ConfigModule {}
