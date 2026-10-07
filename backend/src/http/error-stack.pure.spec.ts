import { stackWithCauses } from './error-stack.pure.js';

describe('stackWithCauses', () => {
  it("retourne la stack d'une erreur sans cause", () => {
    const error = new Error('seule');

    expect(stackWithCauses(error)).toBe(error.stack);
  });

  it('ajoute la stack de la cause', () => {
    const cause = new Error('connexion refusée');
    const error = new Error('indisponible', { cause });

    expect(stackWithCauses(error)).toBe(`${error.stack ?? ''}\nCaused by: ${cause.stack ?? ''}`);
  });

  it('représente une valeur qui nest pas une Error', () => {
    expect(stackWithCauses('texte')).toBe('texte');
  });

  it('borne la profondeur des causes', () => {
    const loop = new Error('boucle');
    loop.cause = loop;

    expect(stackWithCauses(loop).split('Caused by:')).toHaveLength(6);
  });
});
