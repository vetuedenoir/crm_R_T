import type { Column } from '../domain/index.js';
import { parseColumnId, parseContactId, type ColumnId, type ContactId } from '../ids.pure.js';

// UUID déterministes et lisibles : `columnId(2)` désigne toujours la même colonne dans un test.
function uuid(n: number): string {
  return `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
}

export function columnId(n: number): ColumnId {
  const parsed = parseColumnId(uuid(n));
  if (!parsed.ok) {
    throw new Error(parsed.error);
  }
  return parsed.value;
}

export function contactId(n: number): ContactId {
  const parsed = parseContactId(uuid(n));
  if (!parsed.ok) {
    throw new Error(parsed.error);
  }
  return parsed.value;
}

// Un test ne précise que ce qui compte pour lui.
export function buildColumn(overrides: Partial<Column> = {}): Column {
  return { id: columnId(1), name: 'Colonne', type: 'text', position: 0, ...overrides };
}
