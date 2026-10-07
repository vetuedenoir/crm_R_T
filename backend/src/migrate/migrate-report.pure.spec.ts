import { describeMigrateFailure, describeMigrateReport } from './migrate-report.pure.js';

describe('describeMigrateReport', () => {
  it.each([
    ['up', [], 'Aucune migration en attente.'],
    ['revert', [], 'Aucune migration à défaire.'],
    ['up', ['A1', 'B2'], '2 migration(s) appliquée(s) :\n  - A1\n  - B2'],
    ['revert', ['B2'], '1 migration(s) défaite(s) :\n  - B2'],
  ] as const)('%s avec %j', (action, names, expected) => {
    expect(describeMigrateReport(action, names)).toBe(expected);
  });
});

describe('describeMigrateFailure', () => {
  it.each([
    [
      new Error('password authentication failed'),
      'Échec de la migration : password authentication failed',
    ],
    [
      Object.assign(new Error(''), { code: 'ECONNREFUSED' }),
      'Échec de la migration : ECONNREFUSED',
    ],
    [new TypeError(''), 'Échec de la migration : TypeError'],
    ['boom', 'Échec de la migration : boom'],
  ])('%s', (error, expected) => {
    expect(describeMigrateFailure(error)).toBe(expected);
  });
});
