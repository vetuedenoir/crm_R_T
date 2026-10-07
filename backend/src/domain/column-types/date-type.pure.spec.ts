import { DATE_TYPE } from './date-type.pure.js';

describe('type date', () => {
  it.each([
    ['une date ordinaire', '2024-06-15'],
    ["le 29 février d'une année bissextile", '2024-02-29'],
    ["le 29 février de l'an 2000 (divisible par 400)", '2000-02-29'],
    ['le 31 décembre', '2023-12-31'],
    ['la première année', '0001-01-01'],
    ['la dernière année', '9999-12-31'],
  ])('[R13] accepte %s', (_cas, raw) => {
    expect(DATE_TYPE.parse(raw)).toEqual({ ok: true, value: raw });
  });

  it.each([
    ['le 30 février', '2024-02-30'],
    ["le 29 février d'une année non bissextile", '2023-02-29'],
    ["le 29 février de l'an 1900 (divisible par 100)", '1900-02-29'],
    ['le 31 avril', '2024-04-31'],
    ['le mois 13', '2024-13-01'],
    ['le mois 0', '2024-00-10'],
    ['le jour 0', '2024-01-00'],
    ["l'année 0", '0000-01-01'],
    ['le format JJ/MM/AAAA', '15/06/2024'],
    ['des mois et jours sans zéro', '2024-6-5'],
    ['une année sur deux chiffres', '24-06-15'],
    ['un horodatage complet', '2024-06-15T10:00:00Z'],
    ['des espaces autour', ' 2024-06-15 '],
    ['une chaîne vide', ''],
    ['un nombre', 20240615],
    ['un objet Date', new Date('2024-06-15')],
    ['null', null],
    ['undefined', undefined],
  ])('[R16] refuse %s', (_cas, raw) => {
    expect(DATE_TYPE.parse(raw).ok).toBe(false);
  });

  it.each([
    ['2024-01-01', '2024-01-02', -1],
    ['2024-12-31', '2024-01-01', 1],
    ['2024-06-15', '2024-06-15', 0],
    ['2023-12-31', '2024-01-01', -1],
    ['0999-01-01', '1000-01-01', -1],
  ])('[R16] compare %s et %s chronologiquement -> %s', (a, b, attendu) => {
    const first = DATE_TYPE.parse(a);
    const second = DATE_TYPE.parse(b);
    if (!first.ok || !second.ok) {
      throw new Error('dates de test invalides');
    }
    expect(Math.sign(DATE_TYPE.compare(first.value, second.value))).toBe(attendu);
  });

  it('[R13] se stocke dans value_date', () => {
    const date = DATE_TYPE.parse('2024-06-15');
    if (!date.ok) {
      throw new Error('date de test invalide');
    }
    expect(DATE_TYPE.serialize(date.value)).toEqual({ column: 'value_date', value: '2024-06-15' });
  });
});
