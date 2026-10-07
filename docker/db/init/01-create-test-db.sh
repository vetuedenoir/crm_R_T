#!/bin/sh
# Exécuté par l'image postgres au premier démarrage uniquement (volume vide).
# Base séparée pour les tests d'intégration : ils vident les tables, jamais la base de développement.
set -eu

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" \
  -v test_db="$POSTGRES_TEST_DB" <<'SQL'
CREATE DATABASE :"test_db";
SQL
