import { err, ok } from './result.js';

describe('Result', () => {
  it('ok porte une valeur', () => {
    expect(ok(1)).toEqual({ ok: true, value: 1 });
  });

  it('err porte une erreur', () => {
    expect(err('échec')).toEqual({ ok: false, error: 'échec' });
  });
});
