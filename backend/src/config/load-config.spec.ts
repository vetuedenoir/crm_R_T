import { ConfigError, loadConfig } from './load-config.js';

describe('loadConfig', () => {
  it("retourne la configuration d'un environnement valide", () => {
    const config = loadConfig({ DATABASE_URL: 'postgresql://crm:secret@127.0.0.1:5433/crm' });

    expect(config.port).toBe(3000);
  });

  it('refuse de démarrer avec un message listant chaque problème', () => {
    expect(() => loadConfig({ PORT: 'x' })).toThrow(ConfigError);
    expect(() => loadConfig({ PORT: 'x' })).toThrow(/PORT[\s\S]*DATABASE_URL/);
  });
});
