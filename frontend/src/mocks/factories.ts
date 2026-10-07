import { columnIdSchema, contactIdSchema, type CellValue, type Column, type Contact } from '../api';

// Identifiants déterministes : deux exécutions donnent les mêmes données, un test reste lisible.
function fakeUuid(kind: 1 | 2, index: number): string {
  return `00000000-0000-4000-8000-${String(kind)}${String(index).padStart(11, '0')}`;
}

// Un test ne précise que ce qui compte pour lui (RULES §9).
export function buildColumn(overrides: Partial<Column> = {}): Column {
  const position = overrides.position ?? 0;
  return {
    id: columnIdSchema.parse(fakeUuid(1, position)),
    name: `Colonne ${String(position)}`,
    type: 'text',
    position,
    ...overrides,
  };
}

export function buildContact(
  index: number,
  cells: Readonly<Record<string, CellValue>> = {},
): Contact {
  return { id: contactIdSchema.parse(fakeUuid(2, index)), cells };
}
