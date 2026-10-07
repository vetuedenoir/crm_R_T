# CRM en grille

Un CRM minimal où les contacts s'affichent dans une grille façon tableur : colonnes personnalisables
(texte, nombre, date, téléphone), édition en cellule, tri et filtres sur l'ensemble des données, scroll
infini. Stack : NestJS, PostgreSQL, React, le tout en TypeScript strict.

- Décisions techniques et plan de réalisation : [`docs/PLAN.md`](docs/PLAN.md)
- Règles de code et de développement : [`RULES.md`](RULES.md)

> **État d'avancement** : les phases 0 (fondations), 2 à 6 (backend et API), 7 (seed) et 8 (socle frontend)
> sont terminées. La phase 1 (Docker) est partielle : seule la base de données est conteneurisée, l'API et le
> front tournent pour l'instant en local (voir « Développement »). Les sections marquées _à venir_ seront
> complétées au fil des phases du plan.

## Prérequis

- [Docker](https://docs.docker.com/get-docker/) avec Docker Compose
- [Node.js](https://nodejs.org/) récent (LTS) et npm, pour l'outillage et le développement
- `make`

## Lancement

```bash
cp .env.example .env   # une seule fois ; adapter les valeurs si besoin
make up                # démarre la stack Docker
```

`make up` s'exécute au premier plan ; `Ctrl+C` l'arrête. Pour le lancer en arrière-plan :
`docker compose up -d`.

**Aujourd'hui, la stack ne contient que la base PostgreSQL 16.** Elle est publiée sur
`127.0.0.1:5433` (variable `DB_PORT` dans `.env` ; 5433 évite le conflit avec un PostgreSQL local sur
5432). Deux bases sont créées au premier démarrage :

| Base       | Usage                                                         |
| ---------- | ------------------------------------------------------------- |
| `crm`      | Application et développement                                  |
| `crm_test` | Tests d'intégration du backend (jamais la base de développement) |

Connexion : `psql -h 127.0.0.1 -p 5433 -U crm -d crm` (mot de passe : `POSTGRES_PASSWORD` de `.env`).

**Arrêt** : `make down` conserve les données (volume `db-data`).

**Remise à zéro** : `docker compose down -v` supprime aussi le volume, donc toutes les données. Le
prochain `make up` recrée les deux bases. C'est aussi la seule façon de créer `crm_test` sur un volume
créé avant son ajout : PostgreSQL n'exécute les scripts d'initialisation (`docker/db/init/`) que sur un
volume vide.

_À venir_ : l'API (Dockerfile, phase 1) et le front (phase 8) rejoindront la stack ; les URLs de l'application et
`make seed` (1000 contacts fictifs, phase 7) seront documentés à ce moment-là.

## Données fictives (seed)

Le seed insère **1000 contacts** (nom, entreprise, téléphone, date, score) dans les colonnes par défaut.
Il est **reproductible** (graine `faker` fixe : mêmes contacts à chaque fois) et **idempotent** (relancé, il
n'ajoute rien ; sur une base partielle, il ajoute seulement la suite). Environ 5 % des entreprises et 10 %
des téléphones sont volontairement vides, pour exercer le filtre « vide ».

```bash
make seed          # complète la base jusqu'à 1000 contacts
make seed-reset    # supprime TOUS les contacts puis réinsère le jeu
```

`make seed` s'exécute dans le conteneur `api` (à venir avec la phase 1). En attendant, depuis la machine
hôte, sur une base dont les migrations sont appliquées :

```bash
npm --prefix backend run build
npm --prefix backend run seed -- --reset   # `--reset` est optionnel
```

En `NODE_ENV=production`, le seed refuse de tourner sans `--force`.

## Commandes

| Commande            | Rôle                                                          |
| ------------------- | ------------------------------------------------------------- |
| `make help`         | Liste les commandes disponibles                               |
| `make up` / `down`  | Démarre / arrête la stack Docker (base de données seule)      |
| `make seed`         | Insère 1000 contacts fictifs (idempotent, voir « Données fictives ») |
| `make seed-reset`   | Vide les contacts puis réinsère le jeu de données             |
| `make lint`         | ESLint et vérification du format (Prettier)                   |
| `make typecheck`    | `tsc` dans chaque projet                                      |
| `make test`         | Tous les tests (`test-back`, `test-front`, `test-e2e`)        |
| `make test-matrix`  | Génère `docs/TESTING.md` (exigence → tests) _(à venir)_       |

Tant qu'un projet (`backend/`, `frontend/`, `e2e/`) n'existe pas, les cibles qui le concernent affichent
« rien à faire » et réussissent.

## Structure du dépôt

```
backend/        API NestJS : configuration, erreurs, colonnes, contacts, seed, Swagger (/api/docs)
frontend/       Application React + Vite : client d'API, hooks TanStack Query, toasts, mocks MSW (grille : phases 9 à 14)
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
- Les tests du backend qui touchent la base (`/api/health`, puis les phases suivantes) s'exécutent contre
  le vrai PostgreSQL, base `crm_test` : démarrer la base d'abord (`docker compose up -d db`).
- Lancer l'API en local : `npm --prefix backend run build && npm --prefix backend start` (lit `.env`,
  `DATABASE_URL` obligatoire). `GET http://localhost:3000/api/health` répond 200 si la base est joignable,
  503 sinon.
- Lancer le front en local (`frontend/`, voir ci-dessous) : `npm --prefix frontend install`, puis
  `npm --prefix frontend run dev` sur http://localhost:5173. Vite relaie `/api` vers `http://localhost:3000`
  (variable `API_PROXY_TARGET` pour changer de cible). Il faut donc l'API démarrée, **avec les migrations
  appliquées** sur la base `crm` (le lancement automatique des migrations arrive avec la phase 1).
- Sans backend ni base : `npm --prefix frontend run dev:mock` sert le front avec des réponses simulées (MSW,
  120 contacts, mêmes colonnes que la base). Les mêmes mocks servent aux tests.
- Le build du front (`npm --prefix frontend run build`) **échoue** si Tailwind ou une grille/un tableur prêt à
  l'emploi apparaît dans `frontend/package.json` (R20).
- Un hook `pre-commit` applique Prettier et ESLint aux fichiers modifiés.
- `make lint typecheck` doit passer avant chaque commit ; on n'avance à la phase suivante du plan que
  lorsque `make lint typecheck test` est vert.
