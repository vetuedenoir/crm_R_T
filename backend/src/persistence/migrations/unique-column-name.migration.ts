import type { MigrationInterface, QueryRunner } from 'typeorm';

// Deux créations simultanées du même nom passeraient toutes deux la vérification du service : seule la
// base peut garantir l'unicité (insensible à la casse, comme `findNameConflict`).
export class UniqueColumnName1760000000004 implements MigrationInterface {
  name = 'UniqueColumnName1760000000004';

  async up(runner: QueryRunner): Promise<void> {
    await runner.query('CREATE UNIQUE INDEX columns_name_lower_key ON columns (lower(name))');
  }

  async down(runner: QueryRunner): Promise<void> {
    await runner.query('DROP INDEX columns_name_lower_key');
  }
}
