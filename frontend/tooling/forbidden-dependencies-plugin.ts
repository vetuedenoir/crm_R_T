import { readFileSync } from 'node:fs';

import type { Plugin } from 'vite';

import {
  describeForbiddenDependencies,
  findForbiddenDependencies,
} from './forbidden-dependencies.pure.ts';

// Fait échouer le build (et le serveur de développement) si une dépendance interdite par R20 apparaît
// dans package.json : la règle est vérifiée par la machine, pas seulement documentée.
export function forbiddenDependenciesPlugin(manifestPath: string): Plugin {
  return {
    name: 'crm:forbidden-dependencies',
    buildStart() {
      const manifest: unknown = JSON.parse(readFileSync(manifestPath, 'utf8'));
      const violations = findForbiddenDependencies(manifest);
      if (violations.length > 0) {
        this.error(
          `Dépendances interdites dans package.json :\n${describeForbiddenDependencies(violations)}`,
        );
      }
    },
  };
}
