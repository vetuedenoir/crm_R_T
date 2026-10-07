import { resolveRequestId } from './request-id.pure.js';

describe('resolveRequestId', () => {
  it('reprend un identifiant entrant sûr', () => {
    expect(resolveRequestId('abc-123_X.y', () => 'généré')).toBe('abc-123_X.y');
  });

  it.each([
    ['absent', undefined],
    ['vide', ''],
    ['trop long', 'a'.repeat(65)],
    ['avec retour à la ligne', 'abc\nfake log line'],
    ['avec espace', 'a b'],
    ['multiple (tableau)', ['a', 'b']],
  ])('génère un identifiant si le sien est %s', (_cas, incoming) => {
    expect(resolveRequestId(incoming, () => 'généré')).toBe('généré');
  });
});
