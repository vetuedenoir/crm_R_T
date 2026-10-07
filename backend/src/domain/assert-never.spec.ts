import { assertNever } from './assert-never.js';

describe('assertNever', () => {
  it("lève une erreur explicite si un cas non prévu arrive à l'exécution", () => {
    // @ts-expect-error simule une valeur hors de l'union, que le compilateur interdit
    expect(() => assertNever('inconnu')).toThrow('Cas non traité : "inconnu"');
  });
});
