import { generateContacts } from './generate-contacts.pure.js';
import { pendingSeedContacts } from './seed-plan.pure.js';

const SEED = 7;
const TARGET = 20;

describe('pendingSeedContacts', () => {
  it.each([
    ['base vide : tout le jeu', 0, TARGET],
    ['base partielle : seulement la suite', 12, TARGET - 12],
    ['jeu complet : rien', TARGET, 0],
    ['plus de contacts que prévu : rien', TARGET + 5, 0],
  ])('[R17] %s', (_, existing, expected) => {
    expect(pendingSeedContacts(TARGET, existing, SEED)).toHaveLength(expected);
  });

  it('[R17] compléter une base partielle redonne exactement le jeu complet', () => {
    const all = generateContacts(TARGET, SEED);

    expect(pendingSeedContacts(TARGET, 12, SEED)).toEqual(all.slice(12));
  });
});
