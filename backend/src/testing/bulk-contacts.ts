import type { DataSource } from 'typeorm';

export interface BulkColumns {
  readonly name: string;
  readonly score: string;
  readonly date: string;
  readonly phone: string;
}

export const BULK_COUNT = 500;
export const BULK_FIRST_DATE = '2020-01-01';

// Jeu déterministe de `count` contacts, numérotés n = 1..count, écrit en SQL pour rester rapide :
//   - name  : « x007 » / « X007 » (casse alternée), l'ordre insensible à la casse suit n ;
//   - score : n (donc 9 < 10 seulement si le tri est numérique) ;
//   - date  : 2020-01-01 + n jours ;
//   - phone : absent quand n est multiple de 10, sinon « +33 » suivi de n sur 9 chiffres.
// Les contacts sont créés dans l'ordre de n (`created_at` croissant) pour que l'ordre par défaut soit connu.
export async function insertBulkContacts(
  dataSource: DataSource,
  columns: BulkColumns,
  count = BULK_COUNT,
): Promise<void> {
  await dataSource.query(
    `INSERT INTO contacts (id, created_at, updated_at)
     SELECT gen_random_uuid(), now() + n * interval '1 millisecond', now()
     FROM generate_series(1, $1::int) AS n`,
    [count],
  );
  await dataSource.query(
    `WITH numbered AS (
       SELECT id, row_number() OVER (ORDER BY created_at, id) AS n FROM contacts
     )
     INSERT INTO cells (contact_id, column_id, value_text, value_number, value_date)
     SELECT id, $1::uuid, (CASE WHEN n % 2 = 0 THEN 'x' ELSE 'X' END) || lpad(n::text, 3, '0'), NULL::numeric, NULL::date FROM numbered
     UNION ALL
     SELECT id, $2::uuid, NULL::text, n, NULL::date FROM numbered
     UNION ALL
     SELECT id, $3::uuid, NULL::text, NULL::numeric, DATE '${BULK_FIRST_DATE}' + n::int FROM numbered
     UNION ALL
     SELECT id, $4::uuid, '+33' || lpad(n::text, 9, '0'), NULL::numeric, NULL::date FROM numbered WHERE n % 10 <> 0`,
    [columns.name, columns.score, columns.date, columns.phone],
  );
}

// Date de l'énième contact du jeu, au format de l'API.
export function bulkDate(n: number): string {
  return new Date(Date.UTC(2020, 0, 1 + n)).toISOString().slice(0, 10);
}
