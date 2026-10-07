import { MAX_ABSOLUTE_NUMBER, NUMBER_TYPE } from './number-type.pure.js';

describe('type nombre', () => {
  it.each([
    ['un entier', 42, 42],
    ['un décimal', 12.5, 12.5],
    ['un négatif', -3, -3],
    ['zéro', 0, 0],
    ['moins zéro, ramené à zéro', -0, 0],
    ['une chaîne entière', '42', 42],
    ['une chaîne décimale avec point', '12.5', 12.5],
    ['une chaîne décimale avec virgule', '12,5', 12.5],
    ['une chaîne négative', '-7,25', -7.25],
    ['une chaîne avec espaces autour', '  8 ', 8],
    ['le décimal renvoyé par numeric', '12.50', 12.5],
    ['la borne positive', MAX_ABSOLUTE_NUMBER, MAX_ABSOLUTE_NUMBER],
    ['la borne négative', -MAX_ABSOLUTE_NUMBER, -MAX_ABSOLUTE_NUMBER],
  ])('[R13] accepte %s', (_cas, raw, attendu) => {
    expect(NUMBER_TYPE.parse(raw)).toEqual({ ok: true, value: attendu });
  });

  it.each([
    ['NaN', NaN],
    ['Infinity', Infinity],
    ['-Infinity', -Infinity],
    ['au-delà de la borne', MAX_ABSOLUTE_NUMBER + 2],
    ['une chaîne vide', ''],
    ['du texte', 'abc'],
    ['la notation exponentielle', '1e5'],
    ['un séparateur de milliers', '1,000.5'],
    ['deux virgules', '1,5,2'],
    ['un point final', '5.'],
    ['un plus initial', '+5'],
    ['un booléen', true],
    ['null', null],
    ['undefined', undefined],
    ['un objet', {}],
  ])('[R16] refuse %s', (_cas, raw) => {
    expect(NUMBER_TYPE.parse(raw).ok).toBe(false);
  });

  it.each([
    [9, 10, -1],
    [10, 9, 1],
    [2.5, 2.5, 0],
    [-1, 0, -1],
    [100, 20, 1],
  ])('[R16] compare %s et %s numériquement (9 < 10) -> %s', (a, b, attendu) => {
    expect(Math.sign(NUMBER_TYPE.compare(a, b))).toBe(attendu);
  });

  it('[R13] se stocke dans value_number', () => {
    expect(NUMBER_TYPE.serialize(12.5)).toEqual({ column: 'value_number', value: 12.5 });
  });
});
