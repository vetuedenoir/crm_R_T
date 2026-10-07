import { Faker, base, en, fr } from '@faker-js/faker';

// Un champ par colonne par défaut (migration `SeedDefaultColumns`). `null` = cellule vide, qui n'a pas de
// ligne en base : le jeu de données exerce aussi le filtre « vide » et le tri « vides en dernier ».
export interface SeedContact {
  readonly name: string;
  readonly company: string | null;
  readonly phone: string | null;
  readonly date: string;
  readonly score: number;
}

export const SEED_FIRST_DATE = new Date('2020-01-01T00:00:00.000Z');
export const SEED_LAST_DATE = new Date('2025-12-31T00:00:00.000Z');
export const SEED_MAX_SCORE = 100;
const EMPTY_COMPANY_PROBABILITY = 0.05;
const EMPTY_PHONE_PROBABILITY = 0.1;
const MOBILE_DIGITS = 8;
const ISO_DATE_LENGTH = 10;

// Chaque appel crée sa propre instance : l'état du générateur aléatoire ne fuit pas d'un appel à l'autre.
// Le i-ème contact ne dépend pas de `count` : `generateContacts(10, s)` est le début de
// `generateContacts(1000, s)`, ce qui permet de compléter un jeu partiel (voir `pendingSeedContacts`).
export function generateContacts(count: number, seed: number): ReadonlyArray<SeedContact> {
  const faker = new Faker({ locale: [fr, en, base] });
  faker.seed(seed);
  return Array.from({ length: count }, (): SeedContact => {
    const name = faker.person.fullName();
    const company = faker.company.name();
    const phone = `+33${faker.helpers.arrayElement(['6', '7'])}${faker.string.numeric(MOBILE_DIGITS)}`;
    const date = faker.date.between({ from: SEED_FIRST_DATE, to: SEED_LAST_DATE });
    const score = faker.number.int({ min: 0, max: SEED_MAX_SCORE });
    // Les tirages d'absence viennent après les valeurs : rendre une cellule vide ne décale aucune autre valeur.
    const noCompany = faker.datatype.boolean({ probability: EMPTY_COMPANY_PROBABILITY });
    const noPhone = faker.datatype.boolean({ probability: EMPTY_PHONE_PROBABILITY });
    return {
      name,
      company: noCompany ? null : company,
      phone: noPhone ? null : phone,
      date: date.toISOString().slice(0, ISO_DATE_LENGTH),
      score,
    };
  });
}
