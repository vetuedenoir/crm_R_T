# CRM en grille

Un CRM minimal où les contacts s'affichent dans une grille façon tableur : colonnes personnalisables
(texte, nombre, date, téléphone), édition en cellule, tri et filtres sur l'ensemble des données, scroll
infini. Stack : NestJS, PostgreSQL, React, le tout en TypeScript strict.

- Décisions techniques et plan de réalisation : [`docs/PLAN.md`](docs/PLAN.md)
- Règles de code et de développement : [`RULES.md`](RULES.md)

> **État d'avancement** : le dépôt est en phase 0 (fondations). L'application n'existe pas encore ; les
> sections marquées _à venir_ seront complétées au fil des phases du plan.

## Prérequis

- [Docker](https://docs.docker.com/get-docker/) avec Docker Compose _(à venir, phase 1)_
- [Node.js](https://nodejs.org/) récent (LTS) et npm, pour l'outillage et le développement
- `make`

## Lancement _(à venir, phase 1)_

```bash
make up      # construit et démarre la base, l'API et le front
make seed    # insère 1000 contacts fictifs
```

Les URLs, l'arrêt (`make down`) et la remise à zéro seront documentés ici une fois la stack Docker en
place (phase 1).

## Commandes

| Commande            | Rôle                                                          |
| ------------------- | ------------------------------------------------------------- |
| `make help`         | Liste les commandes disponibles                               |
| `make up` / `down`  | Démarre / arrête la stack Docker _(à venir)_                  |
| `make seed`         | Insère 1000 contacts fictifs _(à venir)_                      |
| `make seed-reset`   | Vide les contacts puis réinsère le jeu de données _(à venir)_ |
| `make lint`         | ESLint et vérification du format (Prettier)                   |
| `make typecheck`    | `tsc` dans chaque projet                                      |
| `make test`         | Tous les tests (`test-back`, `test-front`, `test-e2e`)        |
| `make test-matrix`  | Génère `docs/TESTING.md` (exigence → tests) _(à venir)_       |

Tant qu'un projet (`backend/`, `frontend/`, `e2e/`) n'existe pas, les cibles qui le concernent affichent
« rien à faire » et réussissent.

## Structure du dépôt

```
backend/        API NestJS (phase 2)
frontend/       Application React + Vite (phase 8)
e2e/            Tests de bout en bout Playwright (phase 15)
docs/           Plan de réalisation (PLAN.md) et recettes (recipes/)
Makefile        Point d'entrée de toutes les commandes
```

## Développement

```bash
npm install     # installe l'outillage (ESLint, Prettier, commitlint) et active les hooks git
make lint typecheck test
```

- Les commits suivent [Conventional Commits](https://www.conventionalcommits.org/fr/) : `feat:`,
  `fix:`, `test:`, `docs:`, `refactor:`, `chore:`. Un hook `commit-msg` refuse les autres formats.
- Un hook `pre-commit` applique Prettier et ESLint aux fichiers modifiés.
- `make lint typecheck` doit passer avant chaque commit ; on n'avance à la phase suivante du plan que
  lorsque `make lint typecheck test` est vert.
