# CRM en grille

Un CRM minimal où les contacts s'affichent dans une grille façon tableur : colonnes personnalisables
(texte, nombre, date, téléphone), édition en cellule, tri et filtres sur l'ensemble des données, scroll
infini. Stack : NestJS, PostgreSQL, React, le tout en TypeScript strict.

- Décisions techniques et plan de réalisation : [`docs/PLAN.md`](docs/PLAN.md)
- Règles de code et de développement : [`RULES.md`](RULES.md)

> **État honnête du projet** : le backend est complet, le frontend couvre l'affichage, l'édition en cellule, le
> tri, les filtres et la gestion des colonnes. **Il manque l'ajout/suppression de contacts dans l'interface, la
> conteneurisation de l'API et du front, et les tests E2E.** Détail dans « Fonctionnalités ».

## Sommaire

1. [Lancer l'application](#1-lancer-lapplication)
2. [Initialiser la base et les données de démonstration](#2-initialiser-la-base-et-les-données-de-démonstration)
3. [Exécuter les tests](#3-exécuter-les-tests)
4. [Principaux choix techniques](#4-principaux-choix-techniques)
5. [Fonctionnalités terminées et incomplètes](#5-fonctionnalités-terminées-et-incomplètes)
6. [Limites connues](#6-limites-connues)
7. [Améliorations prioritaires](#7-améliorations-prioritaires)
8. [Outils d'IA utilisés](#8-outils-dia-utilisés)
9. [Temps consacré](#9-temps-consacré)
10. [Annexes : commandes, structure, développement](#10-annexes--commandes-structure-développement)

## 1. Lancer l'application

> ⚠️ Le lancement « tout Docker » (`docker compose up` démarrant base, API et front) **n'est pas encore
> disponible** : seule la base PostgreSQL est conteneurisée. L'API et le front tournent en local. Voir
> [limites](#6-limites-connues).

**Prérequis** : [Docker](https://docs.docker.com/get-docker/) avec Compose, [Node.js](https://nodejs.org/) LTS
récent (testé avec Node 24 ; le backend utilise `node --env-file-if-exists`) et npm, `make`.

```bash
# 1. Configuration (une seule fois)
cp .env.example .env                 # adapter les valeurs si besoin

# 2. Base de données (PostgreSQL 16, bases `crm` et `crm_test`)
docker compose up -d db              # ou `make up` (premier plan, Ctrl+C pour arrêter)

# 3. Dépendances (une seule fois)
npm install                          # outillage racine + hooks git
npm --prefix backend install
npm --prefix frontend install

# 4. Schéma et données de démonstration (voir section 2)
npm --prefix backend run build
npm --prefix backend run migrate
npm --prefix backend run seed

# 5. API (terminal 1) puis front (terminal 2)
npm --prefix backend start           # http://localhost:3000
npm --prefix frontend run dev        # http://localhost:5173
```

| URL                                 | Contenu                                                |
| ----------------------------------- | ------------------------------------------------------ |
| http://localhost:5173               | L'application (grille de contacts)                     |
| http://localhost:3000/api/docs      | Documentation Swagger de l'API                         |
| http://localhost:3000/api/health    | 200 si la base est joignable, 503 sinon                |

Vite relaie `/api` vers `http://localhost:3000` (variable `API_PROXY_TARGET` pour changer de cible).

**Sans backend ni base** : `npm --prefix frontend run dev:mock` sert le front avec des réponses simulées (MSW,
120 contacts). Pratique pour travailler l'interface seule ; rien n'est persisté.

**Base de données** : publiée sur `127.0.0.1:5433` (variable `DB_PORT` ; 5433 évite le conflit avec un
PostgreSQL local sur 5432). Connexion : `psql -h 127.0.0.1 -p 5433 -U crm -d crm`.

| Base       | Usage                                                            |
| ---------- | ---------------------------------------------------------------- |
| `crm`      | Application et développement                                     |
| `crm_test` | Tests d'intégration du backend (jamais la base de développement) |

- **Arrêt** : `make down` conserve les données (volume `db-data`).
- **Remise à zéro** : `docker compose down -v` supprime aussi le volume, donc toutes les données. Le prochain
  `docker compose up -d db` recrée les deux bases. C'est aussi la seule façon de créer `crm_test` sur un volume
  antérieur à son ajout : PostgreSQL n'exécute `docker/db/init/` que sur un volume vide.

## 2. Initialiser la base et les données de démonstration

**Migrations** : le schéma ne change que par migration. À appliquer **avant** le seed et avant de lancer l'API.

```bash
npm --prefix backend run build                    # une fois, et après chaque modification du backend
npm --prefix backend run migrate                  # applique les migrations en attente (idempotent)
npm --prefix backend run migrate -- --revert      # défait la dernière migration appliquée, une seule
```

La première migration crée les tables et les colonnes par défaut (nom, entreprise, téléphone, date, score).

- Chaque appel est transactionnel : une migration qui échoue ne laisse rien derrière elle.
- `Ctrl+C` (ou `SIGTERM`) laisse la migration en cours se terminer, puis ferme la connexion. Un second signal
  force l'arrêt (code 130) ; PostgreSQL annule la transaction ouverte.
- En `NODE_ENV=production`, `--revert` exige `--force`.

**Seed** : 1000 contacts fictifs (nom, entreprise, téléphone, date, score).

```bash
npm --prefix backend run seed                     # complète la base jusqu'à 1000 contacts
npm --prefix backend run seed -- --reset          # supprime TOUS les contacts puis réinsère le jeu
```

- **Reproductible** : graine `faker` fixe, donc mêmes contacts à chaque fois.
- **Idempotent** : relancé, il n'ajoute rien ; sur une base partielle, il ajoute seulement la suite.
- Environ 5 % des entreprises et 10 % des téléphones sont volontairement vides, pour exercer le filtre « vide ».
- En `NODE_ENV=production`, le seed refuse de tourner sans `--force`.

(`make seed` / `make seed-reset` exécutent la même chose dans un conteneur `api` qui **n'existe pas encore** :
utiliser les commandes `npm` ci-dessus.)

## 3. Exécuter les tests

```bash
docker compose up -d db     # requis par les tests d'intégration du backend (base crm_test)
make test                   # backend + frontend (+ e2e : « rien à faire » tant qu'il n'existe pas)
```

| Commande          | Périmètre                                                                         |
| ----------------- | --------------------------------------------------------------------------------- |
| `make test-back`  | Jest : unitaires (fonctions pures) et intégration (supertest, vraie base `crm_test`) |
| `make test-front` | Vitest + Testing Library + MSW (réponses API simulées)                            |
| `make lint`       | ESLint strict + vérification Prettier                                             |
| `make typecheck`  | `tsc --noEmit` dans chaque projet                                                 |

État au moment de la rédaction : lint, typecheck et tests au vert (**760 tests backend, 491 tests frontend**).

Les titres de tests portent l'identifiant de l'exigence couverte (`[R7] ...`, voir `docs/PLAN.md` §1) :
`grep -rn "\[R7\]" backend/src frontend/src` liste ce qui couvre le tri. La matrice automatique
(`make test-matrix` → `docs/TESTING.md`) **n'est pas encore écrite**.

Non couvert : aucun test E2E (Playwright), et les composants de gestion des colonnes (dialogues, menu,
glisser-déposer) n'ont pas de test de composant, seulement leur logique pure.

## 4. Principaux choix techniques

Le détail, les alternatives écartées et le coût assumé de chaque choix sont dans [`docs/PLAN.md`](docs/PLAN.md).

- **Modèle EAV typé** : une ligne par cellule, avec des colonnes de valeur typées (`numeric`, `date`, texte).
  Ajouter, renommer ou supprimer une colonne ne change pas le schéma, et le tri/filtre se fait en SQL avec le
  bon type (`9 < 10`, dates chronologiques). Coût : requêtes plus complexes qu'une table classique.
- **Tri et filtre côté serveur** (R15) : ils portent sur tout le jeu de données, pas sur les lignes chargées.
  Le SQL est paramétré et produit par une fonction pure (`build-contacts-query`).
- **Registre de types de colonnes** : une définition par type (texte, nombre, date, téléphone) regroupe
  validation, normalisation, comparaison et opérateurs de filtre, côté back **et** côté front. Ajouter un type
  fait échouer la compilation partout où il est oublié (unions discriminées, `assertNever`).
  Les cas de test communs aux deux côtés sont partagés dans `contract/column-type-cases.json`.
- **« Cœur fonctionnel, coquille impérative »** : la logique métier est en fonctions pures (`*.pure.ts`),
  testables sans base ni DOM ; services Nest et hooks React ne font que les appeler (voir `RULES.md`).
- **Erreurs** : une erreur attendue est une valeur (`Result<T, E>`), jamais une exception. Réponse d'erreur
  uniforme avec `requestId`, filtre d'exceptions global.
- **Backend** : NestJS, TypeORM pour les migrations et transactions, `class-validator` pour la forme des
  requêtes, Swagger sur `/api/docs`, logs JSON.
- **Frontend** : React + Vite, **CSS Modules** (pas de Tailwind), TanStack Query (pages, cache, mises à jour
  optimistes), **TanStack Virtual** (seules quelques lignes sont dans le DOM), dnd-kit (réordonnancement des
  colonnes, avec alternative clavier), zod pour valider les réponses réseau.
- **Contrainte R20 vérifiée par la machine** : le build du front **échoue** si Tailwind ou une grille / un
  tableur prêt à l'emploi apparaît dans `frontend/package.json`. La grille est écrite à la main.
- **Vue dans l'URL** : tri et filtres sont sauvegardés dans l'URL (partageable, survit au rechargement).
- **Qualité** : TypeScript `strict` (+ `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`), ESLint
  `strict-type-checked`, Prettier, Conventional Commits imposés par hook.

## 5. Fonctionnalités terminées et incomplètes

Les identifiants `Rxx` sont ceux de l'énoncé (`docs/PLAN.md` §1).

| ID      | Exigence                                        | État                         | Remarque                                                                 |
| ------- | ----------------------------------------------- | ---------------------------- | ------------------------------------------------------------------------ |
| R1      | Grille de contacts                              | ✅ Terminé                   | Grille virtualisée, en-tête collant                                      |
| R2      | Scroll infini                                   | ✅ Terminé                   | Pages de 50, lignes squelette, compteur « N contacts »                   |
| R3      | Ajouter un contact                              | ⚠️ API seulement             | `POST /api/contacts` fonctionne ; pas de bouton « + » dans la grille     |
| R4      | Modifier un contact                             | ✅ Terminé                   | Via l'édition en cellule                                                 |
| R5      | Supprimer un contact                            | ⚠️ API seulement             | `DELETE /api/contacts/:id` fonctionne ; pas d'action de ligne            |
| R6      | Édition directe dans la grille                  | ✅ Terminé                   | Clavier (flèches, Entrée, Échap, Tab, Suppr), mise à jour optimiste, erreur dans la cellule |
| R7      | Tri par colonne                                 | ✅ Terminé                   | Croissant / décroissant / aucun, menu d'en-tête                          |
| R8      | Filtre par colonne                              | ✅ Terminé                   | Opérateurs et champ de saisie selon le type, filtres combinables         |
| R9–R12  | Ajouter, renommer, supprimer, réorganiser les colonnes | ⚠️ Fait, non commité, peu testé | Dialogues, renommage en place, glisser-déposer. Implémenté et vérifié par lint, typecheck et tests de logique pure ; **pas de test de composant ni E2E, pas de recette manuelle consignée** |
| R13     | Types texte, nombre, date, téléphone            | ✅ Terminé                   | Type immuable après création (voir limites)                              |
| R14     | Persistance                                     | ✅ Terminé                   | Contacts, valeurs, colonnes et ordre en base                             |
| R15     | Tri/filtre sur tout le jeu de données           | ✅ Terminé                   | Côté serveur                                                             |
| R16     | Cohérence par type                              | ✅ Terminé                   | Affichage, édition, tri, validation et filtre pilotés par le registre    |
| R17     | Seed ≥ 500 contacts                             | ✅ Terminé                   | 1000 contacts, reproductible et idempotent                               |
| R18     | Lancement complet par Docker                    | ❌ Incomplet                 | Seule la base est conteneurisée (pas de Dockerfile, pas de nginx)        |
| R19     | Tests vérifiables, visibilité de la couverture  | ⚠️ Partiel                   | Gros socle unitaire/intégration ; pas de matrice exigence → tests, pas de E2E |
| R20     | Pas de Tailwind, pas de grille prête à l'emploi | ✅ Respecté                  | Vérifié par le build                                                     |

## 6. Limites connues

- **Pas de lancement 100 % Docker** : `make up` ne démarre que PostgreSQL ; `make seed` suppose un service
  `api` absent. Les étapes manuelles de la section 1 sont nécessaires.
- **Ajout et suppression de contacts impossibles depuis l'interface** (l'API les gère).
- **Aucun test E2E** : rien ne vérifie le parcours complet navigateur → API → base.
- **Gestion des colonnes** : voir R9–R12 ci-dessus (non commitée, tests de composants absents).
- **Type de colonne immuable** après création : le changer imposerait de convertir toutes les valeurs, avec
  risque de perte.
- **Téléphone** : validation tolérante (6 à 15 chiffres, `+` initial optionnel), sans bibliothèque de numéros
  internationaux.
- **Pas de détection de doublons** de contacts.
- **Un seul espace de travail** : un jeu unique de colonnes et de contacts, pas d'authentification, pas de
  droits, pas de temps réel entre onglets ou utilisateurs.
- Hors périmètre assumé : import/export CSV, formules, sélection et collage multi-cellules, undo/redo,
  responsive mobile avancé, déploiement cloud, fidélité visuelle à Google Sheets.
- Interface en français uniquement.
- Les performances sont validées sur 1000 contacts ; non mesurées au-delà.
- Les tests d'intégration du backend exigent la base Docker démarrée.

## 7. Améliorations prioritaires

Dans l'ordre :

1. **Conteneuriser l'API et le front** (phase 1 du plan) : `backend/Dockerfile`, `frontend/Dockerfile` + nginx
   (proxy `/api`, repli SPA), migrations au démarrage de l'API, pour que `docker compose up --build` suffise.
2. **Ajout et suppression de contacts dans l'interface** (phase 14) : ligne « + » en bas de grille, suppression
   avec confirmation, mise à jour du cache et du `total`. Le backend est prêt.
3. **Tests de la gestion des colonnes** (composants) puis **commit** de la phase 13.
4. **Tests E2E Playwright** (phase 15) : un scénario par exigence, dont « le tri porte sur tout le jeu de
   données » et « l'ordre des colonnes survit au rechargement ».
5. **Matrice exigence → tests** (`make test-matrix` → `docs/TESTING.md`) qui échoue si une exigence n'est
   couverte par aucun test, et seuils de couverture.
6. **CI** (lint, typecheck, tests, build des images) et relecture du README par quelqu'un qui n'a jamais lancé
   le projet.
7. Ensuite : conversion de type de colonne, import/export CSV, undo/redo (points d'accroche décrits dans
   `docs/PLAN.md` §8).

## 8. Outils d'IA utilisés

- **Claude Code** (CLI d'Anthropic, modèles Claude) : conception du plan et des règles de code, implémentation
  du backend et du frontend, rédaction des tests et de la documentation, en dialogue avec le développeur.
- Le code produit est relu, et validé par `make lint typecheck test` avant chaque avancée de phase ; le
  développeur reste seul à commiter (l'agent ne lance jamais `git commit`).

## 9. Temps consacré

**Environ 4 heures**, estimation tirée de l'historique git : de 18 h 01 (premier commit) à environ 22 h le
même jour, soit les phases 0 à 12 plus la gestion des colonnes (phase 13) en cours. À ajuster par l'auteur
s'il compte aussi le temps de réflexion préalable.

---

## 10. Annexes : commandes, structure, développement

### Commandes `make`

| Commande            | Rôle                                                                  |
| ------------------- | --------------------------------------------------------------------- |
| `make help`         | Liste les commandes disponibles                                       |
| `make up` / `down`  | Démarre / arrête la stack Docker (base de données seule pour l'instant) |
| `make seed`         | _(nécessite le conteneur `api`, à venir)_ voir section 2             |
| `make lint`         | ESLint et vérification du format (Prettier)                           |
| `make typecheck`    | `tsc` dans chaque projet                                              |
| `make test`         | Tous les tests (`test-back`, `test-front`, `test-e2e`)                |
| `make test-matrix`  | Génère `docs/TESTING.md` _(à venir)_                                  |

Tant qu'un projet (`backend/`, `frontend/`, `e2e/`) n'existe pas, les cibles qui le concernent affichent
« rien à faire » et réussissent.

### Structure du dépôt

```
backend/        API NestJS : configuration, erreurs, domaine pur, persistance, colonnes, contacts, seed, Swagger
frontend/       React + Vite : client d'API, TanStack Query, registre de types, grille virtualisée, tri/filtres, colonnes
contract/       Cas de test des types de colonnes, partagés entre backend et frontend
docker/db/init/ Script de création de la base de test
e2e/            Tests de bout en bout Playwright (vide : phase 15)
docs/           Plan de réalisation (PLAN.md) et recettes (recipes/, à rédiger)
Makefile        Point d'entrée de toutes les commandes
```

### Développement

- Les commits suivent [Conventional Commits](https://www.conventionalcommits.org/fr/) (`feat:`, `fix:`, `test:`,
  `docs:`, `refactor:`, `chore:`) ; un hook `commit-msg` refuse les autres formats.
- Un hook `pre-commit` applique Prettier et ESLint aux fichiers modifiés.
- `make lint typecheck test` doit être vert avant chaque commit et avant de passer à la phase suivante du plan.
