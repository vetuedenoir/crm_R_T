import { buildTestDatabaseUrl } from './test-database-url.pure.js';

describe('buildTestDatabaseUrl', () => {
  it('vise la base crm_test sur le port publié', () => {
    expect(
      buildTestDatabaseUrl({ POSTGRES_USER: 'crm', POSTGRES_PASSWORD: 'pw', DB_PORT: '5444' }),
    ).toBe('postgresql://crm:pw@127.0.0.1:5444/crm_test');
  });

  it('utilise POSTGRES_TEST_DB et les valeurs par défaut', () => {
    expect(
      buildTestDatabaseUrl({
        POSTGRES_USER: 'crm',
        POSTGRES_PASSWORD: 'pw',
        POSTGRES_TEST_DB: 'autre',
      }),
    ).toBe('postgresql://crm:pw@127.0.0.1:5433/autre');
  });

  it('encode les caractères spéciaux du mot de passe', () => {
    expect(
      buildTestDatabaseUrl({ POSTGRES_USER: 'crm', POSTGRES_PASSWORD: 'p@ss/w:rd' }),
    ).toContain('crm:p%40ss%2Fw%3Ard@');
  });

  it.each([
    ['sans utilisateur', { POSTGRES_PASSWORD: 'pw' }],
    ['sans mot de passe', { POSTGRES_USER: 'crm' }],
  ])("échoue avec un message d'aide %s", (_cas, env) => {
    expect(() => buildTestDatabaseUrl(env)).toThrow(/POSTGRES_USER et POSTGRES_PASSWORD/);
  });
});
