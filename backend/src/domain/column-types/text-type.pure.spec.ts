import { MAX_TEXT_LENGTH, TEXT_TYPE } from './text-type.pure.js';

describe('type texte', () => {
  it.each([
    ['une chaîne simple', 'Alice', 'Alice'],
    ['espaces autour retirés', '  Alice  ', 'Alice'],
    ['la casse est conservée', 'ALice', 'ALice'],
    ['espaces internes conservés', 'Jean  Pierre', 'Jean  Pierre'],
    ['la longueur maximale', 'a'.repeat(MAX_TEXT_LENGTH), 'a'.repeat(MAX_TEXT_LENGTH)],
  ])('[R13] accepte %s', (_cas, raw, attendu) => {
    expect(TEXT_TYPE.parse(raw)).toEqual({ ok: true, value: attendu });
  });

  it.each([
    ['une chaîne vide', ''],
    ['des espaces seuls', '   '],
    ['plus que la longueur maximale', 'a'.repeat(MAX_TEXT_LENGTH + 1)],
    ['un nombre', 42],
    ['null', null],
    ['undefined', undefined],
    ['un objet', {}],
  ])('[R16] refuse %s', (_cas, raw) => {
    expect(TEXT_TYPE.parse(raw).ok).toBe(false);
  });

  it.each([
    ['a', 'b', -1],
    ['b', 'a', 1],
    ['a', 'a', 0],
    ['alice', 'ALICE', 0],
    ['Zoé', 'alice', 1],
    ['bob', 'Alice', 1],
  ])('[R16] compare %s et %s insensiblement à la casse -> %s', (a, b, attendu) => {
    expect(Math.sign(TEXT_TYPE.compare(a, b))).toBe(attendu);
  });

  it('[R13] se stocke dans value_text', () => {
    expect(TEXT_TYPE.serialize('Alice')).toEqual({ column: 'value_text', value: 'Alice' });
  });

  it("[R8] retire les espaces autour d'une recherche", () => {
    expect(TEXT_TYPE.normalizeSearch('  ali ')).toBe('ali');
  });
});
