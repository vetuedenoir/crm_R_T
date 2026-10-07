import { parseCellValue } from '../domain/index.js';

import {
  generateContacts,
  SEED_FIRST_DATE,
  SEED_LAST_DATE,
  SEED_MAX_SCORE,
} from './generate-contacts.pure.js';

const SEED = 42;
const SAMPLE = 1000;

describe('generateContacts', () => {
  it('[R17] produit le nombre de contacts demandé', () => {
    expect(generateContacts(0, SEED)).toHaveLength(0);
    expect(generateContacts(SAMPLE, SEED)).toHaveLength(SAMPLE);
  });

  it('[R17] est reproductible : même graine, mêmes contacts', () => {
    expect(generateContacts(50, SEED)).toEqual(generateContacts(50, SEED));
  });

  it('[R17] change avec la graine', () => {
    expect(generateContacts(50, SEED)).not.toEqual(generateContacts(50, SEED + 1));
  });

  it('[R17] un petit jeu est le début d’un grand : le seed peut être complété', () => {
    expect(generateContacts(1000, SEED).slice(0, 10)).toEqual(generateContacts(10, SEED));
  });

  describe('valeurs produites', () => {
    const contacts = generateContacts(SAMPLE, SEED);

    it.each([
      ['nom', 'text', (c: (typeof contacts)[number]) => c.name],
      ['entreprise', 'text', (c: (typeof contacts)[number]) => c.company],
      ['téléphone', 'phone', (c: (typeof contacts)[number]) => c.phone],
      ['date', 'date', (c: (typeof contacts)[number]) => c.date],
      ['score', 'number', (c: (typeof contacts)[number]) => c.score],
    ] as const)(
      '[R13][R17] %s : toute valeur renseignée est acceptée par le type %s',
      (_, type, read) => {
        for (const contact of contacts) {
          const value = read(contact);
          if (value !== null) {
            expect(parseCellValue(type, value).ok).toBe(true);
          }
        }
      },
    );

    it('[R17] le nom est toujours renseigné', () => {
      expect(contacts.every((contact) => contact.name.trim() !== '')).toBe(true);
    });

    it('[R17] quelques entreprises et téléphones sont vides, pas tous', () => {
      const emptyPhones = contacts.filter((contact) => contact.phone === null).length;
      const emptyCompanies = contacts.filter((contact) => contact.company === null).length;

      expect(emptyPhones).toBeGreaterThan(0);
      expect(emptyPhones).toBeLessThan(SAMPLE / 2);
      expect(emptyCompanies).toBeGreaterThan(0);
      expect(emptyCompanies).toBeLessThan(SAMPLE / 2);
    });

    it('[R16] les dates sont dans la période prévue', () => {
      const first = SEED_FIRST_DATE.toISOString().slice(0, 10);
      const last = SEED_LAST_DATE.toISOString().slice(0, 10);

      expect(contacts.every((contact) => contact.date >= first && contact.date <= last)).toBe(true);
    });

    it('[R16] les scores sont des entiers bornés, avec des écarts pour que le tri soit visible', () => {
      const scores = contacts.map((contact) => contact.score);

      expect(scores.every((score) => Number.isInteger(score) && score >= 0)).toBe(true);
      expect(Math.max(...scores)).toBeLessThanOrEqual(SEED_MAX_SCORE);
      expect(new Set(scores).size).toBeGreaterThan(50);
    });
  });
});
