import { parseColumnId, parseContactId, type ColumnId, type ContactId } from './ids.pure.js';

const UUID = '3f2b8c1e-9a4d-4e57-8b21-0c6d5a7e9f10';

describe('identifiants nominaux', () => {
  it.each([
    ['ColumnId', parseColumnId],
    ['ContactId', parseContactId],
  ])('%s accepte un UUID et le normalise en minuscules', (_nom, parse) => {
    expect(parse(UUID.toUpperCase())).toEqual({ ok: true, value: UUID });
  });

  it.each([
    ['une chaîne vide', ''],
    ['un texte quelconque', 'abc'],
    ['un UUID tronqué', UUID.slice(0, -1)],
    ['un UUID avec un caractère non hexadécimal', UUID.replace('3f', 'zz')],
    ['un nombre', 42],
    ['null', null],
    ['undefined', undefined],
    ['un objet', {}],
  ])('refuse %s', (_cas, raw) => {
    expect(parseColumnId(raw).ok).toBe(false);
    expect(parseContactId(raw).ok).toBe(false);
  });

  it('empêche à la compilation de confondre les identifiants', () => {
    const columnId = parseColumnId(UUID);
    if (!columnId.ok) {
      throw new Error('UUID de test invalide');
    }

    // @ts-expect-error un ColumnId n'est pas un ContactId
    const contactId: ContactId = columnId.value;
    // @ts-expect-error une chaîne quelconque n'est pas un ColumnId
    const fromString: ColumnId = UUID;

    expect([contactId, fromString]).toHaveLength(2);
  });
});
