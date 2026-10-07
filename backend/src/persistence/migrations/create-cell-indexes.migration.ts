import type { MigrationInterface, QueryRunner } from 'typeorm';

// Un index par colonne de valeur, préfixé par `column_id` : tri et filtres d'une colonne restent
// indexés. Le texte est indexé en minuscules, comme `buildContactsQuery` le compare.
export class CreateCellIndexes1760000000002 implements MigrationInterface {
  name = 'CreateCellIndexes1760000000002';

  async up(runner: QueryRunner): Promise<void> {
    await runner.query('CREATE INDEX cells_text_idx ON cells (column_id, lower(value_text))');
    await runner.query('CREATE INDEX cells_number_idx ON cells (column_id, value_number)');
    await runner.query('CREATE INDEX cells_date_idx ON cells (column_id, value_date)');
  }

  async down(runner: QueryRunner): Promise<void> {
    await runner.query('DROP INDEX cells_date_idx');
    await runner.query('DROP INDEX cells_number_idx');
    await runner.query('DROP INDEX cells_text_idx');
  }
}
