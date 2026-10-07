/** @type {import('jest').Config} */
export default {
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  testEnvironment: 'node',
  // Les tests d'intégration partagent la base `crm_test` (tables vidées, schéma recréé) : un seul worker
  // évite qu'un fichier efface les données d'un autre en cours d'exécution.
  maxWorkers: 1,
  extensionsToTreatAsEsm: ['.ts'],
  // Les imports relatifs s'écrivent en `.js` (ESM) ; Jest doit les résoudre vers les sources `.ts`.
  moduleNameMapper: { '^(\\.{1,2}/.*)\\.js$': '$1' },
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: '<rootDir>/../tsconfig.json', useESM: true }],
  },
};
