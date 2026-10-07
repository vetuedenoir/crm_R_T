import type { AppConfig } from './app-config.js';
import { parseConfig } from './parse-config.pure.js';

export class ConfigError extends Error {
  constructor(readonly issues: ReadonlyArray<string>) {
    super(`Configuration invalide :\n${issues.map((issue) => `  - ${issue}`).join('\n')}`);
    this.name = 'ConfigError';
  }
}

// Seul endroit qui lit `process.env` ; échoue vite plutôt que de démarrer avec une configuration douteuse.
export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const result = parseConfig(env);
  if (!result.ok) {
    throw new ConfigError(result.error);
  }
  return result.value;
}
