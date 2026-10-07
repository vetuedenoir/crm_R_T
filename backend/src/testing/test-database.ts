import { DataSource } from 'typeorm';

import { ENTITIES, MIGRATIONS } from '../persistence/index.js';

import { buildTestDatabaseUrl } from './test-database-url.pure.js';

// Connexion à `crm_test` avec le schéma à jour. `runMigrations` ne rejoue que ce qui manque : après le
// premier appel, les suivants sont quasi instantanés (« migrations jouées une fois »).
export async function createTestDataSource(): Promise<DataSource> {
  const dataSource = new DataSource({
    type: 'postgres',
    url: buildTestDatabaseUrl(process.env),
    entities: ENTITIES,
    migrations: MIGRATIONS,
    synchronize: false,
  });
  await dataSource.initialize();
  await dataSource.runMigrations();
  return dataSource;
}

// Nettoyage entre deux tests. Les colonnes par défaut posées par la migration disparaissent aussi :
// un test construit les colonnes dont il a besoin au lieu de dépendre de celles du seed.
export async function clearTables(dataSource: DataSource): Promise<void> {
  await dataSource.query('TRUNCATE cells, contacts, columns');
}

// Repart d'une base sans aucun objet, pour tester les migrations elles-mêmes.
export async function resetSchema(dataSource: DataSource): Promise<void> {
  await dataSource.query('DROP SCHEMA public CASCADE');
  await dataSource.query('CREATE SCHEMA public');
}
