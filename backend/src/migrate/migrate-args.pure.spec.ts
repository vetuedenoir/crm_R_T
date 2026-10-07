import { parseMigrateArgs } from './migrate-args.pure.js';

describe('parseMigrateArgs', () => {
  it.each([
    [[], 'development', 'up'],
    [[], 'production', 'up'],
    [['--revert'], 'development', 'revert'],
    [['--revert', '--force'], 'production', 'revert'],
    [['--force'], 'production', 'up'],
  ])('accepte %j en %s : action %s', (argv, nodeEnv, action) => {
    expect(parseMigrateArgs(argv, nodeEnv)).toEqual({ ok: true, value: { action } });
  });

  it('refuse de défaire une migration en production sans --force', () => {
    const result = parseMigrateArgs(['--revert'], 'production');

    expect(result.ok).toBe(false);
    expect(!result.ok && result.error).toContain('--force');
  });

  it('refuse une option inconnue', () => {
    const result = parseMigrateArgs(['--revrt'], 'development');

    expect(result.ok).toBe(false);
    expect(!result.ok && result.error).toContain('--revrt');
  });
});
