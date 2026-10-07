import type { MigrationInterface, QueryRunner } from 'typeorm';

// Colonnes natives = vraies lignes de `columns` : aucun cas particulier face aux colonnes personnalisées.
const DEFAULT_COLUMNS = [
  { name: 'Nom', type: 'text' },
  { name: 'Entreprise', type: 'text' },
  { name: 'Téléphone', type: 'phone' },
  { name: 'Date', type: 'date' },
  { name: 'Score', type: 'number' },
] as const;

export class SeedDefaultColumns1760000000003 implements MigrationInterface {
  name = 'SeedDefaultColumns1760000000003';

  async up(runner: QueryRunner): Promise<void> {
    for (const [position, column] of DEFAULT_COLUMNS.entries()) {
      await runner.query('INSERT INTO columns (name, type, position) VALUES ($1, $2, $3)', [
        column.name,
        column.type,
        position,
      ]);
    }
  }

  async down(runner: QueryRunner): Promise<void> {
    // Les cellules partent en cascade : revenir en arrière efface bien les valeurs de ces colonnes.
    for (const column of DEFAULT_COLUMNS) {
      await runner.query('DELETE FROM columns WHERE name = $1 AND type = $2', [
        column.name,
        column.type,
      ]);
    }
  }
}
