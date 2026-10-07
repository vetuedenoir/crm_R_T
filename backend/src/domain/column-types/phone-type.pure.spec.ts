import { MAX_PHONE_DIGITS, MIN_PHONE_DIGITS, PHONE_TYPE } from './phone-type.pure.js';

describe('type téléphone', () => {
  it.each([
    ['des chiffres seuls', '0612345678', '0612345678'],
    ['des espaces', '06 12 34 56 78', '0612345678'],
    ['des points', '06.12.34.56.78', '0612345678'],
    ['des tirets', '06-12-34-56-78', '0612345678'],
    ['des parenthèses', '(06) 12 34 56 78', '0612345678'],
    ['un plus initial', '+33 6 12 34 56 78', '+33612345678'],
    ['un plus initial et un indicatif entre parenthèses', '+(33) 612345678', '+33612345678'],
    ['une espace insécable', '06 12 34 56 78', '0612345678'],
    ['le minimum de chiffres', '1'.repeat(MIN_PHONE_DIGITS), '1'.repeat(MIN_PHONE_DIGITS)],
    ['le maximum de chiffres', '1'.repeat(MAX_PHONE_DIGITS), '1'.repeat(MAX_PHONE_DIGITS)],
    [
      'le maximum de chiffres avec un plus',
      `+${'1'.repeat(MAX_PHONE_DIGITS)}`,
      `+${'1'.repeat(MAX_PHONE_DIGITS)}`,
    ],
  ])('[R13] accepte et normalise %s', (_cas, raw, attendu) => {
    expect(PHONE_TYPE.parse(raw)).toEqual({ ok: true, value: attendu });
  });

  it.each([
    ['trop peu de chiffres', '1'.repeat(MIN_PHONE_DIGITS - 1)],
    ['trop de chiffres', '1'.repeat(MAX_PHONE_DIGITS + 1)],
    ['un plus au milieu', '06+12345678'],
    ['deux plus', '++33612345678'],
    ['des lettres', '06 12 ab 56 78'],
    ['un poste', '0612345678 #12'],
    ['un plus seul', '+'],
    ['une chaîne vide', ''],
    ['des séparateurs seuls', ' - . '],
    ['un nombre', 612345678],
    ['null', null],
    ['undefined', undefined],
  ])('[R16] refuse %s', (_cas, raw) => {
    expect(PHONE_TYPE.parse(raw).ok).toBe(false);
  });

  it('[R16] relit sans changement une valeur déjà normalisée (idempotence)', () => {
    const once = PHONE_TYPE.parse('+33 6 12 34 56 78');
    if (!once.ok) {
      throw new Error('numéro de test invalide');
    }
    expect(PHONE_TYPE.parse(once.value)).toEqual(once);
  });

  it('[R16] compare les numéros normalisés comme du texte', () => {
    const a = PHONE_TYPE.parse('0611111111');
    const b = PHONE_TYPE.parse('0622222222');
    if (!a.ok || !b.ok) {
      throw new Error('numéros de test invalides');
    }
    expect(PHONE_TYPE.compare(a.value, b.value)).toBe(-1);
    expect(PHONE_TYPE.compare(b.value, a.value)).toBe(1);
    expect(PHONE_TYPE.compare(a.value, a.value)).toBe(0);
  });

  it('[R13] se stocke dans value_text', () => {
    const phone = PHONE_TYPE.parse('06 12 34 56 78');
    if (!phone.ok) {
      throw new Error('numéro de test invalide');
    }
    expect(PHONE_TYPE.serialize(phone.value)).toEqual({
      column: 'value_text',
      value: '0612345678',
    });
  });

  it.each([
    ['06 12', '0612'],
    ['+33 (6)', '336'],
    ['abc', ''],
  ])('[R8] la recherche de %s porte sur les chiffres : %s', (saisie, attendu) => {
    expect(PHONE_TYPE.normalizeSearch(saisie)).toBe(attendu);
  });
});
