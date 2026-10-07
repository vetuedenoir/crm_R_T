import { parseSeedArgs } from './seed-args.pure.js';

describe('parseSeedArgs', () => {
  it.each([
    [[], 'development', { reset: false }],
    [['--reset'], 'development', { reset: true }],
    [['--force'], 'production', { reset: false }],
    [['--reset', '--force'], 'production', { reset: true }],
    [['--force'], 'development', { reset: false }],
  ])('[R17] accepte %j en %s', (argv, nodeEnv, expected) => {
    expect(parseSeedArgs(argv, nodeEnv)).toEqual({ ok: true, value: expected });
  });

  it.each([[[]], [['--reset']]])('[R17] refuse %j en production sans --force', (argv) => {
    const result = parseSeedArgs(argv, 'production');

    expect(result.ok).toBe(false);
    expect(!result.ok && result.error).toContain('--force');
  });

  it('[R17] refuse une option inconnue', () => {
    const result = parseSeedArgs(['--rest'], 'development');

    expect(result.ok).toBe(false);
    expect(!result.ok && result.error).toContain('--rest');
  });
});
