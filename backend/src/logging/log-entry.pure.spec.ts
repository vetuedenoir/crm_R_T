import { buildLogEntry, serializeLogEntry, type LogInput } from './log-entry.pure.js';

const TIME = new Date('2026-10-07T12:00:00.000Z');
const base: LogInput = {
  level: 'info',
  message: 'bonjour',
  params: [],
  time: TIME,
  requestId: undefined,
};

describe('buildLogEntry', () => {
  it('produit horodatage, niveau et message', () => {
    expect(buildLogEntry(base)).toEqual({
      time: '2026-10-07T12:00:00.000Z',
      level: 'info',
      message: 'bonjour',
    });
  });

  it('prend le dernier paramètre texte pour contexte', () => {
    expect(buildLogEntry({ ...base, params: ['MonService'] })).toMatchObject({
      context: 'MonService',
    });
  });

  it('ajoute le requestId quand il existe', () => {
    expect(buildLogEntry({ ...base, requestId: 'req-1' })).toMatchObject({ requestId: 'req-1' });
  });

  it('sépare la stack du contexte pour une erreur', () => {
    expect(
      buildLogEntry({ ...base, level: 'error', params: ['Error: boom\n  at x', 'MonService'] }),
    ).toMatchObject({ stack: 'Error: boom\n  at x', context: 'MonService' });
  });

  it("n'interprète pas un premier paramètre comme une stack hors niveau erreur", () => {
    const entry = buildLogEntry({ ...base, level: 'warn', params: ['a', 'MonService'] });

    expect(entry).not.toHaveProperty('stack');
    expect(entry).toMatchObject({ context: 'MonService' });
  });

  it('extrait message et stack quand on journalise une Error', () => {
    const error = new Error('échec');

    expect(buildLogEntry({ ...base, level: 'error', message: error })).toMatchObject({
      message: 'échec',
      stack: error.stack,
    });
  });

  it('représente un message non textuel', () => {
    expect(buildLogEntry({ ...base, message: { a: 1 } }).message).toBe('{ a: 1 }');
  });
});

describe('serializeLogEntry', () => {
  it('produit une ligne JSON unique', () => {
    const line = serializeLogEntry(buildLogEntry({ ...base, message: 'a\nb' }));

    expect(line).not.toContain('\n');
    expect(JSON.parse(line)).toMatchObject({ message: 'a\nb' });
  });
});
