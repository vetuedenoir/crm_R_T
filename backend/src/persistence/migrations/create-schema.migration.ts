import type { MigrationInterface, QueryRunner } from 'typeorm';

// Une migration est figée une fois publiée : les valeurs de l'enum sont écrites en dur, pas importées du domaine.
export class CreateSchema1760000000001 implements MigrationInterface {
  name = 'CreateSchema1760000000001';

  async up(runner: QueryRunner): Promise<void> {
    await runner.query(`CREATE TYPE column_type AS ENUM ('text', 'number', 'date', 'phone')`);
    await runner.query(`
      CREATE TABLE columns (
        id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        name       text NOT NULL,
        type       column_type NOT NULL,
        position   integer NOT NULL,
        config     jsonb NOT NULL DEFAULT '{}',
        created_at timestamptz NOT NULL DEFAULT now()
      )`);
    await runner.query(`
      CREATE TABLE contacts (
        id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )`);
    // Les cascades font de la suppression d'un contact ou d'une colonne un simple DELETE.
    await runner.query(`
      CREATE TABLE cells (
        contact_id   uuid NOT NULL REFERENCES contacts (id) ON DELETE CASCADE,
        column_id    uuid NOT NULL REFERENCES columns (id) ON DELETE CASCADE,
        value_text   text,
        value_number numeric,
        value_date   date,
        PRIMARY KEY (contact_id, column_id),
        CONSTRAINT cells_single_value CHECK (num_nonnulls(value_text, value_number, value_date) <= 1)
      )`);
  }

  async down(runner: QueryRunner): Promise<void> {
    await runner.query('DROP TABLE cells');
    await runner.query('DROP TABLE contacts');
    await runner.query('DROP TABLE columns');
    await runner.query('DROP TYPE column_type');
  }
}
