import type { Column, Contact } from '../api';

import { buildColumn, buildContact } from './factories';

// Les colonnes natives créées par la migration `SeedDefaultColumns` du backend.
export const DEFAULT_COLUMNS: ReadonlyArray<Column> = [
  buildColumn({ position: 0, name: 'Nom', type: 'text' }),
  buildColumn({ position: 1, name: 'Entreprise', type: 'text' }),
  buildColumn({ position: 2, name: 'Téléphone', type: 'phone' }),
  buildColumn({ position: 3, name: 'Date', type: 'date' }),
  buildColumn({ position: 4, name: 'Score', type: 'number' }),
];

export const MOCK_CONTACT_COUNT = 120;

function mockContact(index: number): Contact {
  const [name, company, , , score] = DEFAULT_COLUMNS;
  return buildContact(index, {
    ...(name === undefined ? {} : { [name.id]: `Contact ${String(index)}` }),
    ...(company === undefined ? {} : { [company.id]: `Société ${String(index % 10)}` }),
    ...(score === undefined ? {} : { [score.id]: index % 100 }),
  });
}

export const MOCK_CONTACTS: ReadonlyArray<Contact> = Array.from(
  { length: MOCK_CONTACT_COUNT },
  (_unused, index) => mockContact(index + 1),
);
