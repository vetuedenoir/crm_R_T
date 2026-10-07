import type { Brand } from './brand.js';
import { err, ok, type Result } from './result.js';

export type ColumnId = Brand<string, 'ColumnId'>;
export type ContactId = Brand<string, 'ContactId'>;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// PostgreSQL renvoie les UUID en minuscules : on normalise pour que deux ids égaux soient `===`.
function parseUuid(raw: unknown): Result<string, string> {
  return typeof raw === 'string' && UUID_PATTERN.test(raw)
    ? ok(raw.toLowerCase())
    : err("l'identifiant doit être un UUID");
}

// Seuls points de création d'un identifiant nominal : la chaîne vient d'être validée comme UUID.
function toColumnId(uuid: string): ColumnId {
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  return uuid as ColumnId;
}

function toContactId(uuid: string): ContactId {
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  return uuid as ContactId;
}

export function parseColumnId(raw: unknown): Result<ColumnId, string> {
  const uuid = parseUuid(raw);
  return uuid.ok ? ok(toColumnId(uuid.value)) : uuid;
}

export function parseContactId(raw: unknown): Result<ContactId, string> {
  const uuid = parseUuid(raw);
  return uuid.ok ? ok(toContactId(uuid.value)) : uuid;
}
