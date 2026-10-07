/** @type {import('jest').Config} */
export default {
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  // Les imports relatifs s'écrivent en `.js` (ESM) ; Jest doit les résoudre vers les sources `.ts`.
  moduleNameMapper: { '^(\\.{1,2}/.*)\\.js$': '$1' },
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: '<rootDir>/../tsconfig.json', useESM: true }],
  },
};
