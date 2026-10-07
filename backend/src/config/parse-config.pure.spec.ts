import { parseConfig } from './parse-config.pure.js';

const VALID_URL = 'postgresql://crm:secret@127.0.0.1:5433/crm';

describe('parseConfig', () => {
  it('lit une configuration complète', () => {
    expect(parseConfig({ NODE_ENV: 'production', PORT: '8080', DATABASE_URL: VALID_URL })).toEqual({
      ok: true,
      value: { nodeEnv: 'production', port: 8080, databaseUrl: VALID_URL },
    });
  });

  it('applique les valeurs par défaut de NODE_ENV et PORT', () => {
    expect(parseConfig({ DATABASE_URL: VALID_URL })).toEqual({
      ok: true,
      value: { nodeEnv: 'development', port: 3000, databaseUrl: VALID_URL },
    });
  });

  it.each([
    ['PORT absent de la plage', { PORT: '70000' }, 'PORT'],
    ['PORT nul', { PORT: '0' }, 'PORT'],
    ['PORT non numérique', { PORT: '80a' }, 'PORT'],
    ['PORT vide', { PORT: '' }, 'PORT'],
    ['NODE_ENV inconnu', { NODE_ENV: 'staging' }, 'NODE_ENV'],
    ['DATABASE_URL absente', { DATABASE_URL: undefined }, 'DATABASE_URL'],
    ['DATABASE_URL vide', { DATABASE_URL: '' }, 'DATABASE_URL'],
    ['DATABASE_URL illisible', { DATABASE_URL: 'pas une url' }, 'DATABASE_URL'],
    ["DATABASE_URL d'un autre protocole", { DATABASE_URL: 'mysql://h/db' }, 'DATABASE_URL'],
  ])('refuse : %s', (_cas, overrides, variable) => {
    const result = parseConfig({ DATABASE_URL: VALID_URL, ...overrides });

    expect(result.ok).toBe(false);
    expect(!result.ok && result.error.join('\n')).toContain(variable);
  });

  it('rapporte toutes les erreurs en une fois', () => {
    const result = parseConfig({ NODE_ENV: 'staging', PORT: 'x' });

    expect(!result.ok && result.error).toHaveLength(3);
  });

  it("ne divulgue pas l'URL de base de données dans les erreurs", () => {
    const result = parseConfig({ DATABASE_URL: 'mysql://crm:secret@h/db' });

    expect(!result.ok && result.error.join('\n')).not.toContain('secret');
  });
});
