import { buildColumn, columnId } from '../testing/factories.js';

import { findNameConflict, MAX_COLUMN_NAME_LENGTH, parseColumnName } from './column-name.pure.js';
import { nextColumnPosition } from './next-column-position.pure.js';

describe('parseColumnName', () => {
  it.each([
    ['un nom simple', 'Ville', 'Ville'],
    ['un nom entouré d’espaces', '  Ville  ', 'Ville'],
    ['un nom accentué', 'Téléphone mobile', 'Téléphone mobile'],
    [
      'la longueur maximale',
      'a'.repeat(MAX_COLUMN_NAME_LENGTH),
      'a'.repeat(MAX_COLUMN_NAME_LENGTH),
    ],
  ])('[R9] accepte %s', (_cas, raw, expected) => {
    expect(parseColumnName(raw)).toEqual({ ok: true, value: expected });
  });

  it.each([
    ['une chaîne vide', ''],
    ['des espaces seuls', '   '],
    ['un nombre', 42],
    ['null', null],
    ['undefined', undefined],
    ['un objet', { name: 'Ville' }],
    ['un nom trop long', 'a'.repeat(MAX_COLUMN_NAME_LENGTH + 1)],
  ])('[R9] refuse %s', (_cas, raw) => {
    const result = parseColumnName(raw);

    expect(result.ok).toBe(false);
  });
});

describe('findNameConflict', () => {
  const columns = [
    buildColumn({ id: columnId(1), name: 'Ville' }),
    buildColumn({ id: columnId(2), name: 'Score' }),
  ];

  it.each([
    ['le même nom', 'Ville'],
    ['une casse différente', 'VILLE'],
    ['une casse mixte', 'sCoRe'],
  ])('[R9] détecte un doublon avec %s', (_cas, name) => {
    expect(findNameConflict(name, columns)).toBeDefined();
  });

  it('[R9] ne signale rien pour un nom libre', () => {
    expect(findNameConflict('Pays', columns)).toBeUndefined();
  });

  it('[R10] ignore la colonne renommée elle-même (changement de casse seul)', () => {
    expect(findNameConflict('ville', columns, columnId(1))).toBeUndefined();
  });

  it('[R10] signale quand même le nom d’une autre colonne', () => {
    expect(findNameConflict('score', columns, columnId(1))?.id).toBe(columnId(2));
  });
});

describe('nextColumnPosition', () => {
  it.each([
    ['aucune colonne', [], 0],
    ['positions contiguës', [0, 1, 2], 3],
    ['positions avec un trou', [0, 5], 6],
    ['colonnes dans le désordre', [3, 0, 1, 2], 4],
  ])('[R9] avec %s, place la nouvelle colonne en dernier', (_cas, positions, expected) => {
    const columns = positions.map((position, index) =>
      buildColumn({ id: columnId(index + 1), position }),
    );

    expect(nextColumnPosition(columns)).toBe(expected);
  });
});
