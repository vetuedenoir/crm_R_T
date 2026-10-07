# CRM en grille — Décisions techniques et plan de réalisation

> Ce document répond à deux questions : **pourquoi** chaque choix a été fait, et **comment** on avance,
> étape par étape. Chaque décision indique les alternatives écartées et le coût assumé, pour qu'elle
> soit facile à expliquer et à remettre en cause.

## Sommaire

1. [Exigences et identifiants](#1-exigences-et-identifiants)
2. [Résumé des décisions](#2-résumé-des-décisions)
3. [Règles de développement](#3-règles-de-développement)
4. [Modèle de données : EAV](#4-modèle-de-données--eav)
5. [Choix techniques détaillés](#5-choix-techniques-détaillés)
6. [Gestion des erreurs](#6-gestion-des-erreurs)
7. [Stratégie de tests](#7-stratégie-de-tests)
8. [Extensibilité](#8-extensibilité)
9. [Plan de réalisation détaillé](#9-plan-de-réalisation-détaillé)
10. [Hors périmètre et hypothèses](#10-hors-périmètre-et-hypothèses)

---

## 1. Exigences et identifiants

Chaque exigence de l'énoncé a un identifiant. Les tests le reprennent dans leur titre (`[R7] ...`) pour
produire la matrice exigence → tests (voir §7).

| ID | Exigence |
|---|---|
| R1 | Afficher les contacts sous forme de grille (ligne = contact, colonne = information) |
| R2 | Charger progressivement les contacts (scroll infini) |
| R3 | Ajouter un contact |
| R4 | Modifier un contact |
| R5 | Supprimer un contact |
| R6 | Modifier une valeur directement dans la grille |
| R7 | Trier selon une colonne |
| R8 | Filtrer selon une colonne |
| R9 | Ajouter une colonne |
| R10 | Renommer une colonne |
| R11 | Supprimer une colonne |
| R12 | Réorganiser les colonnes |
| R13 | Types de colonnes : texte, nombre, date, téléphone |
| R14 | Persistance (contacts, valeurs, colonnes, ordre) après rechargement |
| R15 | Tri et filtres appliqués à **tout** le jeu de données, pas aux seules lignes affichées |
| R16 | Affichage, édition, tri, validation et filtre cohérents avec le type de la colonne |
| R17 | Initialisation simple de la base avec au moins 500 contacts fictifs |
| R18 | Lancement complet par Docker, instructions documentées |
| R19 | Tests faciles à vérifier et à compléter, avec bonne visibilité sur ce qui est testé |
| R20 | Contraintes de stack : pas de Tailwind, pas de grille ou tableur prêt à l'emploi |

---

## 2. Résumé des décisions

| Domaine | Choix | Raison en une phrase |
|---|---|---|
| Langage | TypeScript strict partout | Le typage est la première ligne de défense contre les erreurs |
| Backend | NestJS | Structure modulaire imposée, injection de dépendances, adapté à l'évolution (auth, WebSocket) |
| Base de données | PostgreSQL 16 | Imposée ; types natifs `numeric` et `date` pour trier et filtrer correctement |
| Modèle de données | **EAV typé** (une ligne par cellule, colonnes de valeur typées) | Flexibilité maximale pour la suite, index possibles par colonne dynamique |
| Accès aux données | TypeORM (migrations, transactions) + SQL paramétré généré par une fonction pure | Convention Nest pour le cycle de vie, SQL explicite là où la requête est dynamique |
| Validation back | `class-validator` (forme des requêtes) + registre de types (valeurs des cellules) | Idiome NestJS ; la logique par type reste dans du code pur testable |
| Doc d'API | `@nestjs/swagger` | Contrat REST lisible et vérifiable |
| Frontend | React + Vite + TypeScript, CSS Modules | Imposé ; CSS Modules évitent les collisions de noms sans Tailwind |
| Données serveur | TanStack Query | Scroll infini, cache et mises à jour optimistes sans code maison |
| Virtualisation | TanStack Virtual | Primitive autorisée, indispensable pour des milliers de lignes |
| Glisser-déposer | dnd-kit | Primitive accessible (clavier) et maintenue |
| Validation des réponses API | zod (front uniquement) | Les données réseau sont `unknown` : on les prouve avant de les typer |
| Tests | Jest, supertest, Vitest, Testing Library, MSW, Playwright | Un outil par niveau, standards du marché |
| Infra | Docker Compose (db, api, web/nginx) | Un seul `docker compose up` ; nginx supprime le CORS |
| Qualité | ESLint strict + Prettier + EditorConfig + Conventional Commits | Une norme unique, vérifiée par machine |

---

## 3. Règles de développement

Ces règles sont **vérifiées par l'outillage** (ESLint, `tsc`, CI) chaque fois que c'est possible, pas
seulement documentées.

### 3.1 Fonctions pures d'abord : « cœur fonctionnel, coquille impérative »

- Toute la **logique métier** (validation d'une valeur, normalisation, construction de la requête SQL,
  assemblage des contacts, calcul du nouvel ordre des colonnes) est écrite en **fonctions pures** : mêmes
  entrées, mêmes sorties, aucun effet de bord.
- Une fonction pure n'accède ni à la base, ni à l'horloge, ni au hasard, ni à `process.env`, et n'importe
  rien de NestJS ou de React. Le temps, les identifiants et l'aléatoire sont **passés en paramètres**.
- Les **effets** (base de données, HTTP, DOM) vivent dans une fine couche autour : services Nest,
  hooks React. Ils appellent le cœur pur et ne contiennent pas de règle métier.
- Les fonctions pures ne lancent pas d'exception pour les cas attendus : elles retournent un
  `Result<T, E>` (voir §6).
- Pas de mutation : `readonly`, `ReadonlyArray`, `as const`, copies par spread.

Pourquoi : une fonction pure se teste avec un simple tableau d'entrées/sorties, sans mock, sans base. C'est
ce qui rend les tests « faciles à vérifier et à compléter » (R19), et c'est ce qui rend le code simple à
expliquer.

### 3.2 Typage strict

- `tsconfig` : `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride`,
  `noFallthroughCasesInSwitch`, `noUnusedLocals`, `noUnusedParameters`.
- `any` interdit (`@typescript-eslint/no-explicit-any` en erreur). Les entrées externes (JSON réseau, corps
  de requête, ligne SQL) sont de type `unknown` jusqu'à validation.
- Les assertions `as` et le `!` non-null sont interdits, sauf commentaire justifié.
- **Types nominaux (« branded »)** pour les identifiants : `ColumnId` et `ContactId` ne sont pas
  interchangeables avec un `string` quelconque, ni entre eux.
- **Unions discriminées** pour tout ce qui varie selon le type de colonne :

  ```ts
  type CellValue =
    | { readonly type: 'text'; readonly value: string }
    | { readonly type: 'number'; readonly value: number }
    | { readonly type: 'date'; readonly value: IsoDate }
    | { readonly type: 'phone'; readonly value: PhoneNumber };
  ```

  Un `switch` sur `type` doit être exhaustif (vérifié par `never` à la compilation) : ajouter un type de
  colonne fait échouer la compilation partout où il est oublié.
- Types de retour **explicites** sur toute fonction exportée.

### 3.3 Norme claire et stricte

| Sujet | Règle |
|---|---|
| Format | Prettier (config unique à la racine), EditorConfig |
| Lint | `typescript-eslint` en mode `strict-type-checked`, `eslint-plugin-import` (ordre des imports) |
| Fichiers | `kebab-case.ts` ; un concept par fichier ; `*.spec.ts` / `*.test.ts` à côté du code testé |
| Nommage | `PascalCase` types/classes/composants, `camelCase` fonctions/variables, `SCREAMING_SNAKE_CASE` constantes globales |
| Taille | Fonction ≤ 40 lignes, complexité cyclomatique ≤ 10, fichier ≤ 300 lignes (règles ESLint) |
| Exports | Exports nommés uniquement (pas de `export default`), un `index.ts` public par module |
| Dépendances | Un module ne dépend que de ce que son `index.ts` expose ; la logique pure ne dépend jamais des couches d'effets |
| Commits | Conventional Commits (`feat:`, `fix:`, `test:`, `docs:`, `refactor:`) |
| Commentaires | On commente le **pourquoi**, jamais le « quoi » |
| Qualité | `make lint` et `make typecheck` doivent passer avant chaque commit |

### 3.4 Code réutilisable comme gabarit (templates)

Le code doit servir de modèle pour les développements futurs. Concrètement :

- Chaque motif récurrent a **une implémentation de référence** et une **recette** courte dans
  `docs/recipes/` :
  - ajouter un type de colonne ;
  - ajouter un endpoint REST (DTO, contrôleur, service, test d'intégration) ;
  - ajouter un opérateur de filtre ;
  - ajouter un composant de cellule ou un éditeur.
- Les motifs sont **uniformes** : tous les modules Nest ont la même forme (`*.module.ts`,
  `*.controller.ts`, `*.service.ts`, `*.dto.ts`, `*.pure.ts`, `*.spec.ts`), tous les types de colonnes ont le
  même contrat (§5.5). Copier un module existant suffit pour en créer un nouveau.
- Des générateurs automatiques (type `plop`) pourront être ajoutés plus tard si les recettes se révèlent
  répétitives. On ne les écrit pas avant d'en avoir besoin.

---

## 4. Modèle de données : EAV

### 4.1 Décision

On stocke **une ligne par cellule** (Entity–Attribute–Value). Un contact est une simple identité, ses
valeurs sont des lignes de la table `cells`, rattachées à une colonne.

```
columns  ( id uuid PK, name text NOT NULL, type column_type NOT NULL,
           position int NOT NULL, config jsonb NOT NULL DEFAULT '{}', created_at timestamptz )

contacts ( id uuid PK, created_at timestamptz, updated_at timestamptz )

cells    ( contact_id uuid  → contacts(id) ON DELETE CASCADE,
           column_id  uuid  → columns(id)  ON DELETE CASCADE,
           value_text   text,
           value_number numeric,
           value_date   date,
           PRIMARY KEY (contact_id, column_id),
           CHECK (num_nonnulls(value_text, value_number, value_date) <= 1) )

-- index de tri et de filtre, par colonne
CREATE INDEX cells_text_idx   ON cells (column_id, lower(value_text));
CREATE INDEX cells_number_idx ON cells (column_id, value_number);
CREATE INDEX cells_date_idx   ON cells (column_id, value_date);
```

Règles de stockage :

- **Cellule vide = pas de ligne.** Vider une cellule supprime la ligne. La table reste creuse et « pas de
  valeur » n'a qu'une seule représentation.
- **Une seule colonne de valeur est renseignée**, selon le type de la colonne :

  | Type | Colonne | Remarque |
  |---|---|---|
  | texte | `value_text` | tri insensible à la casse via `lower()` |
  | téléphone | `value_text` | stocké normalisé (chiffres et `+` initial), affiché formaté |
  | nombre | `value_number` | `numeric`, donc sans erreur d'arrondi flottant |
  | date | `value_date` | `date` SQL, sérialisée en `YYYY-MM-DD` |

- **`config jsonb`** sur `columns` : réservé aux évolutions (options d'une liste, formule). Il évite une
  migration quand un type aura besoin de paramètres.
- Les colonnes par défaut (nom, entreprise, téléphone, date, score) sont de vraies lignes de `columns`
  créées par migration : il n'y a **aucun cas particulier** entre colonnes natives et personnalisées.

### 4.2 Pourquoi EAV plutôt que les alternatives

| Option | Avantages | Inconvénients | Verdict |
|---|---|---|---|
| `ALTER TABLE` par colonne | Types natifs, requêtes simples | DDL déclenché par chaque action utilisateur, noms de colonnes dynamiques dans le SQL (risque d'injection), migrations fragiles | Écarté |
| `contacts.data jsonb` | Une seule table, lecture simple | Tri et filtre par cast à la volée, pas d'index typé sur une clé dynamique, types non garantis par la base | Écarté |
| **EAV typé** | Structure fixe (aucun DDL), **types garantis par la base**, **index par colonne**, suppression de colonne = `DELETE` en cascade, ajout de métadonnées par cellule possible (historique, commentaires, formule) | Lecture d'un contact = plusieurs lignes à assembler ; requêtes de tri/filtre à générer avec des jointures | **Retenu** |

La flexibilité pour la suite est le critère principal : une cellule étant une **entité à part entière**, on
peut lui rattacher plus tard une formule, un historique, un auteur ou un verrou d'édition sans toucher à la
structure. L'EAV « naïf » (tout en texte) est critiqué à juste titre pour ses types faibles et ses
performances ; les colonnes de valeur typées et les index par colonne répondent précisément à ces deux
critiques.

### 4.3 Coûts assumés et mitigations

| Coût | Mitigation |
|---|---|
| Un contact est réparti sur N lignes | Lecture en **2 requêtes** : (1) les ids de la page triée/filtrée ; (2) toutes les cellules de ces ids (`contact_id = ANY($1)`). L'assemblage est une **fonction pure** `assembleContacts` |
| Le SQL de tri/filtre est dynamique | Il est produit par **une seule fonction pure** `buildContactsQuery(query, columns)` qui retourne les deux requêtes `{ ids, count }`, chacune de forme `{ sql, params }` (mêmes filtres garantis). Tous les identifiants viennent de la table `columns` (jamais du client), toutes les valeurs sont des paramètres liés |
| Les contraintes de type ne s'expriment pas en SQL (le type vit dans `columns`) | La cohérence est garantie par le registre de types **avant** l'écriture, et par le `CHECK` qui interdit plusieurs valeurs sur une même cellule |
| Écritures plus nombreuses à la création d'un contact | Insertion groupée (un seul `INSERT ... VALUES (...), (...)`) dans une transaction |

### 4.4 Schéma des requêtes

**Tri** : jointure externe sur la colonne triée, valeurs nulles en dernier, `contacts.id` en départage pour
une pagination stable.

```sql
SELECT c.id
FROM contacts c
LEFT JOIN cells s ON s.contact_id = c.id AND s.column_id = $1      -- colonne triée
WHERE <filtres>
ORDER BY s.value_number ASC NULLS LAST, c.id ASC                   -- ou lower(s.value_text), s.value_date
LIMIT $2 OFFSET $3;
```

**Filtres** : une clause `EXISTS` par filtre, combinées en `AND`. Elles sont indépendantes les unes des
autres et se testent séparément.

```sql
AND EXISTS (SELECT 1 FROM cells f1
            WHERE f1.contact_id = c.id AND f1.column_id = $4 AND f1.value_number > $5)
```

**Total** (pour dimensionner le scroll) : `SELECT count(*)` avec les mêmes filtres.

Les opérateurs de filtre dépendent du type de colonne :

| Type | Opérateurs |
|---|---|
| texte | contient, égal, commence par, vide, non vide |
| nombre | `=`, `≠`, `>`, `≥`, `<`, `≤`, entre, vide, non vide |
| date | égal, avant, après, entre, vide, non vide |
| téléphone | contient (sur les chiffres), égal, vide, non vide |

Le filtre « vide » se traduit par `NOT EXISTS` (absence de ligne), ce qui découle directement du choix « cellule
vide = pas de ligne ».

---

## 5. Choix techniques détaillés

### 5.1 TypeScript strict partout

Un seul langage et un seul niveau d'exigence pour le front et le back. Le typage strict transforme une
grande classe d'erreurs d'exécution en erreurs de compilation. *Alternative écartée : JavaScript, qui
n'offre aucune garantie sur les types de colonnes, cœur du sujet.*

### 5.2 NestJS

- Architecture en **modules** imposée : chaque fonctionnalité (colonnes, contacts, seed) est isolée, ce qui
  rend le projet facile à expliquer et à étendre.
- **Injection de dépendances** : les services sont remplaçables dans les tests.
- Les pièces dont on aura besoin plus tard existent déjà : *guards* (authentification, permissions),
  *interceptors*, *gateways* (WebSocket), *filters* (erreurs).

*Alternatives écartées : Express/Fastify seuls (structure à inventer, donc à expliquer et à maintenir).*

### 5.3 PostgreSQL + TypeORM

- PostgreSQL est imposé. `numeric` et `date` natifs rendent tri et comparaisons corrects par construction.
- **TypeORM** sert au cycle de vie : entités, **migrations versionnées** (pas de `synchronize` en dehors des
  tests), transactions. C'est l'intégration standard de NestJS.
- La requête dynamique de liste n'utilise **pas** le QueryBuilder : c'est du SQL paramétré généré par une
  fonction pure (§4.3), plus lisible et testable sans base. TypeORM l'exécute via `dataSource.query`.

*Alternatives écartées : Prisma (génération de code, requêtes dynamiques sur colonnes variables
inconfortables) ; `pg` seul (il faudrait réécrire migrations et gestion de transactions).*

### 5.4 Validation en deux couches

1. **Forme** de la requête (types JSON, UUID, bornes de pagination) : `class-validator` +
   `ValidationPipe` en mode strict (`whitelist`, `forbidNonWhitelisted`). Idiome NestJS, intégré à Swagger.
2. **Valeur d'une cellule**, qui dépend du type de la colonne : registre de types (§5.5), en fonction
   pure, retournant un `Result`.

Cette séparation évite de faire entrer la logique des types dans des décorateurs, où elle serait difficile à
tester.

### 5.5 Registre de types de colonnes (le cœur de la cohérence, R13 et R16)

Chaque type implémente un contrat unique, et c'est le **seul endroit** où le type est défini :

```ts
interface ColumnTypeDefinition<TType extends ColumnTypeName, TValue> {
  readonly name: TType;
  readonly storage: 'value_text' | 'value_number' | 'value_date';
  readonly filterOperators: ReadonlyArray<FilterOperator>;
  parse(raw: unknown): Result<TValue, ValidationError>;           // valide et normalise
  compare(a: TValue, b: TValue): number;                           // cohérent avec le tri SQL
  serialize(value: TValue): StoredCell;                            // vers la base
  normalizeSearch(text: string): string;                           // saisie de « contient » / « commence par »
}
```

Le tri, le filtre et la validation lisent tous ce registre ; le front a son pendant (affichage, éditeur,
saisie du filtre). **Ajouter un type de colonne = ajouter un fichier + une entrée dans le registre**, et le
compilateur signale tout ce qui reste à compléter (union exhaustive).

Le front duplique volontairement une partie de la validation (retour immédiat dans l'interface) ; le back
reste la source de vérité. On ne crée pas de package partagé front/back : le gain est faible face à la
complexité de build Docker. Des **tests de contrat** vérifient que les deux côtés acceptent et rejettent les
mêmes valeurs (jeu de cas partagé en JSON).

### 5.6 React + Vite + CSS Modules

- **Vite** : démarrage et rechargement à chaud rapides, build statique simple à servir par nginx.
- **CSS Modules** : styles locaux à chaque composant, aucune collision, CSS classique (R20).
  Les couleurs, espacements et tailles de cellule sont des **variables CSS** (`styles/tokens.css`) : un
  changement de thème ou de densité se fait à un seul endroit.

### 5.7 Grille écrite à la main, avec des primitives

Une grille métier complète est interdite ; les primitives sont autorisées. On écrit donc nous-mêmes les
composants de grille (en-tête, cellule, éditeur, menu de colonne, barre de filtres) et on s'appuie sur :

- **TanStack Query** : `useInfiniteQuery` (pages successives), cache, invalidation, **mises à jour
  optimistes avec retour arrière** en cas d'erreur serveur. Écrire cela à la main serait long et fragile.
- **TanStack Virtual** : seules les lignes visibles sont dans le DOM. Le défilement est dimensionné avec le
  `total` renvoyé par l'API, avec des lignes « squelette » pendant le chargement : la barre de défilement
  est juste dès le départ.
- **dnd-kit** : réorganisation des colonnes, avec support clavier et lecteurs d'écran.
- **zod** : valide les réponses de l'API à la frontière réseau (voir §6).

Aucune librairie de formulaires ni store global : l'état serveur est dans TanStack Query, l'état d'interface
(cellule active, édition en cours, plage sélectionnée) dans un `useReducer` dont le **réducteur est une
fonction pure** testable seule. Les dialogues (ajout/renommage de colonne) sont trop simples pour justifier
`react-hook-form`.

### 5.8 Pagination par offset

`limit` + `offset` avec un tri stable (départage par id) et un `total`. Simple à expliquer et à tester. Le
défaut connu : si des lignes sont insérées pendant un défilement, une ligne peut apparaître deux fois ou
être sautée. Une pagination par curseur (keyset) corrigerait cela mais complique fortement le code sur des
colonnes de tri dynamiques et typées. C'est une évolution possible, isolée dans `buildContactsQuery`.

### 5.9 Docker Compose

Trois services : `db` (PostgreSQL, healthcheck, volume nommé), `api` (build multi-stage, migrations puis
démarrage), `web` (build Vite servi par nginx, qui relaie `/api` vers `api`). nginx sur la même origine
supprime la configuration CORS. L'`api` attend que `db` soit « healthy ». Tout est paramétré par des variables
d'environnement (`.env.example`), ce qui suffira pour un futur déploiement cloud.

Le seed se lance avec `make seed` : **1000 contacts**, graine `faker` fixe (données reproductibles),
idempotent, option `--reset`.

---

## 6. Gestion des erreurs

Principe : **une erreur attendue est une valeur, une erreur inattendue est une exception, et aucune ne
disparaît en silence.**

### 6.1 Cœur pur : `Result`

```ts
type Result<T, E> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E };
```

Les fonctions pures (validation, construction de requête) retournent un `Result` : l'appelant est **forcé**
par le compilateur de traiter l'échec. Pas de `throw` pour un cas métier prévu.

### 6.2 Backend

- **Hiérarchie d'erreurs métier typées** (`AppError` avec `code` stable, message, détails, statut HTTP) :
  `VALIDATION_FAILED` (422), `COLUMN_NOT_FOUND` / `CONTACT_NOT_FOUND` (404), `INVALID_FILTER` (400),
  `INVALID_SORT` (400), `CONFLICT` (409), `INTERNAL` (500).
- **Un seul `ExceptionFilter` global** transforme toute erreur en réponse uniforme :

  ```json
  { "error": { "code": "VALIDATION_FAILED", "message": "...", "details": [...], "requestId": "..." } }
  ```

  Il traduit aussi les erreurs de `ValidationPipe` et celles de PostgreSQL (UUID invalide, violation de clé
  étrangère, etc.). Aucun détail interne (stack, SQL) n'est exposé au client.
- **Validation de la configuration au démarrage** : si une variable d'environnement manque ou est invalide,
  l'API refuse de démarrer avec un message clair (échec rapide).
- **Transactions** pour toute opération multi-lignes : suppression de colonne, réordonnancement, création de
  contact avec ses cellules. Tout réussit ou rien n'est écrit.
- **Journalisation** structurée avec un `requestId` par requête ; les erreurs 5xx sont loguées avec leur
  stack, les 4xx au niveau `warn`.
- **Arrêt propre** (`enableShutdownHooks`) : connexions fermées, requêtes en cours terminées.

### 6.3 Frontend

- **Frontière réseau typée** : toute réponse passe par un schéma zod. Une réponse inattendue produit une
  `ApiError` explicite plutôt qu'un `undefined` plus loin dans l'interface. Les erreurs sont typées
  (`NetworkError`, `ValidationApiError`, `NotFoundError`, `ServerError`).
- **Erreur de cellule** : une valeur rejetée (422) est annulée dans le cache optimiste, la cellule est
  surlignée et affiche le message du serveur ; l'utilisateur peut corriger sans perdre sa saisie.
- **Erreurs de chargement** : état d'erreur avec bouton « Réessayer » dans la grille ; les erreurs réseau
  transitoires sont retentées automatiquement (TanStack Query).
- **`ErrorBoundary`** autour de la grille : une erreur de rendu n'écrase pas toute l'application.
- **Notifications** (toasts) pour les erreurs d'actions hors cellule (suppression, renommage, etc.).
- Les erreurs ne sont jamais avalées par un `catch {}` vide (règle ESLint).

---

## 7. Stratégie de tests

Objectif (R19) : on voit d'un coup d'œil ce qui est testé, et ajouter un test est trivial.

### 7.1 Niveaux

| Niveau | Outils | Ce qu'on teste | Pourquoi ce niveau |
|---|---|---|---|
| Unitaire back (pur) | Jest, `it.each` | Registre de types, `buildContactsQuery`, `assembleContacts`, calcul d'ordre des colonnes | Rapide, sans mock, sans base ; un cas = une ligne de tableau |
| Intégration back | Jest + supertest + **vrai PostgreSQL** (base `crm_test`) | Endpoints, migrations, SQL réel, transactions | La logique de tri/filtre est du SQL : un mock ne prouverait rien |
| Unitaire front | Vitest + Testing Library + MSW | Registre de types front, réducteur de grille, éditeurs, UI de filtre, scroll infini | Rapide ; MSW simule l'API au niveau HTTP |
| Contrat front/back | Jeu de cas JSON partagé | Mêmes valeurs acceptées/rejetées des deux côtés | Compense l'absence de package partagé (§5.5) |
| E2E | Playwright sur la stack Docker complète | Un scénario par exigence utilisateur | Seul niveau qui prouve que l'ensemble fonctionne |

### 7.2 Visibilité

- **Titre de test = exigence + comportement** : `[R15] trie sur l'ensemble des données, pas sur la page`.
- **Matrice de traçabilité** `docs/TESTING.md`, générée par `make test-matrix` à partir des tags `[Rxx]` :
  pour chaque exigence, la liste des tests et leur niveau. Une exigence **sans test** est signalée en
  erreur par la CI.
- **Couverture** HTML pour Jest et Vitest (`coverage/`), avec seuil minimal sur le code pur (≥ 90 %).
- **Une commande** : `make test` lance tout ; `make test-back`, `make test-front`, `make test-e2e` isolent.
- **Données de test explicites** : fabriques (`buildColumn()`, `buildContact()`) avec valeurs par défaut,
  pour qu'un test ne précise que ce qui compte.
- **Cas critiques à couvrir impérativement**, car ils portent le risque métier :
  - avec 500 contacts, tri descendant : la première page contient le maximum **global** (R15) ;
  - un filtre ne compte que sur l'ensemble des données (`total` correct) (R15) ;
  - nombres triés numériquement (`9 < 10`), pas alphabétiquement (R16) ;
  - dates triées chronologiquement ; texte insensible à la casse ; valeurs vides en dernier (R16) ;
  - supprimer une colonne retire ses cellules et ses tris/filtres ne cassent pas l'API (R11) ;
  - l'ordre des colonnes survit à un rechargement (R12, R14) ;
  - valeur invalide pour le type : rejet 422 avec message par cellule (R16).

---

## 8. Extensibilité

Aucune de ces fonctionnalités n'est développée maintenant. Le tableau indique **où elles s'accrocheront**.

| Évolution | Point d'accroche prévu |
|---|---|
| Authentification, permissions | Modules isolés : un *guard* global suffit. Un `workspace_id` s'ajoute par migration sur `contacts` et `columns` |
| Temps réel | Toute écriture passe par **un seul service** (`CellsService`) qui pourra publier des événements vers une *gateway* WebSocket ; le front patche le cache TanStack Query |
| Formules | `columns.config` + nouveau fichier dans le registre de types ; la cellule étant une entité (EAV), elle peut porter l'expression |
| Sélection / copier-coller multi-cellules | Le modèle de sélection est une **plage** (ancre + focus) dès le départ ; `parse` du registre sert au collage ; un endpoint batch s'ajoute |
| Import / export CSV | Réutilise le registre (validation) et `buildContactsQuery` sans pagination (export filtré) |
| Historique et undo/redo | Écritures via un point unique → table `cell_changes` ; côté front, les mutations sont déjà des commandes isolées et réversibles |
| Responsive mobile avancé | Mise en page pilotée par des variables CSS, composants sans tailles en dur |
| Déploiement cloud | Configuration 12-factor, API sans état, images Docker séparées, `/api/health` |
| Aspect Google Sheets | Thème centralisé dans `tokens.css` |

---

## 9. Plan de réalisation détaillé

Légende : **[Rxx]** = exigence couverte. Chaque phase se termine par un **critère de fin** vérifiable.
On ne passe à la suivante que lorsque `make lint typecheck test` est vert.

### Phase 0 — Fondations du dépôt

- 0.1 Initialiser git (`git init`), `.gitignore`, `.editorconfig`, licence si besoin.
- 0.2 Créer la structure : `backend/`, `frontend/`, `docs/`, `docs/recipes/`, `e2e/`.
- 0.3 `tsconfig.base.json` strict partagé (options listées en §3.2).
- 0.4 ESLint (`strict-type-checked`), Prettier, règles de taille et d'imports, `no-explicit-any`.
- 0.5 Conventional Commits (commitlint) et hook de pré-commit léger (lint + typecheck des fichiers modifiés).
- 0.6 `Makefile` : `up`, `down`, `seed`, `lint`, `typecheck`, `test`, `test-back`, `test-front`, `test-e2e`,
  `test-matrix`.
- 0.7 Squelette de `README.md` (lancement, structure, liens vers ce plan).

**Critère de fin** : `make lint typecheck` s'exécute sur des projets vides sans erreur.

### Phase 1 — Infrastructure Docker [R18]

- 1.1 `docker-compose.yml` : service `db` (PostgreSQL 16, healthcheck, volume nommé), `.env.example`.
- 1.2 `backend/Dockerfile` multi-stage (build, puis image d'exécution minimale, utilisateur non root).
- 1.3 `frontend/Dockerfile` (build Vite, puis nginx) et `nginx.conf` (service statique, repli SPA, proxy `/api`).
- 1.4 Service `api` : `depends_on` avec `condition: service_healthy`, migrations au démarrage.
- 1.5 Base `crm_test` séparée, créée par script d'initialisation de `db`, pour les tests d'intégration.
- 1.6 Section « Lancement » du README (prérequis, `make up`, `make seed`, URLs, arrêt, remise à zéro).

**Critère de fin** : `docker compose up --build` démarre les trois services ; `/api/health` répond 200.

### Phase 2 — Socle backend (NestJS)

- 2.1 Création de l'application, structure de modules, préfixe `/api`.
- 2.2 Configuration typée et validée au démarrage ; échec explicite si invalide (§6.2).
- 2.3 Types de base purs : `Result`, helpers `ok`/`err`, types nominaux `ColumnId`/`ContactId`.
- 2.4 Hiérarchie `AppError` et codes d'erreur.
- 2.5 `ExceptionFilter` global (réponse uniforme, `requestId`, traduction des erreurs PostgreSQL et du `ValidationPipe`).
- 2.6 `ValidationPipe` strict, journalisation structurée, `enableShutdownHooks`.
- 2.7 Endpoint `GET /api/health` (vérifie la base).
- 2.8 Swagger sur `/api/docs`.
- 2.9 Tests unitaires du filtre d'erreurs (chaque type d'erreur → bon statut et bon corps).

**Critère de fin** : toute erreur, même inattendue, produit la réponse JSON uniforme sans fuite d'information.

### Phase 3 — Domaine pur : types, requêtes, assemblage [R7, R8, R13, R15, R16]

- 3.1 Définir `ColumnTypeName`, `StoredCell`, `CellValue` (union discriminée) et `FilterOperator`.
- 3.2 Contrat `ColumnTypeDefinition` (§5.5).
- 3.3 Type **texte** : `parse`, `compare` insensible à la casse, opérateurs.
- 3.4 Type **nombre** : refus de `NaN`/`Infinity`, bornes, normalisation de la virgule décimale si acceptée.
- 3.5 Type **date** : format `YYYY-MM-DD`, rejet des dates impossibles (30 février).
- 3.6 Type **téléphone** : normalisation (espaces, points, tirets, parenthèses), longueur 6 à 15 chiffres, `+` initial optionnel.
- 3.7 Registre `COLUMN_TYPES` avec vérification d'exhaustivité à la compilation.
- 3.8 `buildContactsQuery` : tri (jointure externe), filtres (`EXISTS` / `NOT EXISTS`), pagination, total.
  Retourne `Result<{ ids, count }, QueryError>` (deux `{ sql, params }` : la page et le total) ; refuse une colonne inconnue ou un opérateur invalide pour le type.
- 3.9 `assembleContacts` : regroupe les cellules par contact, dans l'ordre des ids reçus.
- 3.10 `computeColumnOrder` : calcule les positions à partir d'une liste ordonnée d'ids, refuse doublons, ids inconnus et colonnes oubliées (l'ordre doit être une permutation complète).
- 3.11 Tests unitaires en tableaux `it.each`, y compris les cas limites de §7.2.

**Critère de fin** : le domaine est couvert à ≥ 90 % sans aucune base de données ni mock.

### Phase 4 — Persistance [R14]

- 4.1 Entités TypeORM `Column`, `Contact`, `Cell`.
- 4.2 Migration 1 : types, tables, contraintes (`CHECK`), clés étrangères en cascade.
- 4.3 Migration 2 : index `cells_text_idx`, `cells_number_idx`, `cells_date_idx`.
- 4.4 Migration 3 : colonnes par défaut (nom, entreprise, téléphone, date, score) avec leurs positions.
- 4.5 Dépôts (repositories) : accès bruts, sans règle métier.
- 4.6 Utilitaire de test : reset de la base `crm_test`, migrations jouées une fois, nettoyage par test.
- 4.7 Test d'intégration : les migrations s'appliquent sur une base vide et sont réversibles.

**Critère de fin** : base vide → migrations → colonnes par défaut présentes.

### Phase 5 — API des colonnes [R9, R10, R11, R12, R13, R14]

- 5.1 DTO et contrôleur : `GET /columns` (ordonné), `POST /columns`.
- 5.2 `PATCH /columns/:id` (renommage uniquement ; le type est immuable → 422 explicite si tenté).
- 5.3 `DELETE /columns/:id` en transaction (les cellules partent en cascade).
- 5.4 `PUT /columns/order` : applique `computeColumnOrder` en transaction.
- 5.5 Règles : nom non vide, longueur max, unicité insensible à la casse (409 si doublon).
- 5.6 Tests d'intégration pour chaque cas nominal et chaque erreur.

**Critère de fin** : toutes les opérations de colonne fonctionnent via l'API et l'ordre survit à un redémarrage.

### Phase 6 — API des contacts [R2, R3, R4, R5, R7, R8, R15, R16]

- 6.1 `GET /contacts` : lecture des paramètres `offset`, `limit` (borné), `sort`, `filters` ; validation des DTO.
- 6.2 Exécution : requête des ids (`buildContactsQuery`), requête des cellules, `assembleContacts`, `total`.
- 6.3 `POST /contacts` : valeurs initiales validées par le registre, insertion groupée en transaction.
- 6.4 `PATCH /contacts/:id` : fusion partielle ; une valeur `null` supprime la cellule ; `updated_at` mis à jour.
- 6.5 `DELETE /contacts/:id`.
- 6.6 Erreurs : valeur invalide → 422 avec le détail **par colonne** ; colonne inconnue → 404/400.
- 6.7 Tests d'intégration avec 500 contacts : tri global, filtres globaux, `total`, pagination sans doublon ni trou
  sur un jeu stable, un test par type de colonne et par opérateur.
- 6.8 Test de non-régression d'injection (nom de colonne ou valeur de filtre hostile).

**Critère de fin** : tous les cas critiques de §7.2 côté API sont verts.

### Phase 7 — Seed [R17]

- 7.1 Générateur **pur** `generateContacts(count, seed)` (graine `faker` fixe → données reproductibles).
- 7.2 Commande `npm run seed` : insère par lots, idempotente, option `--reset` ; refuse de tourner en production sans `--force`.
- 7.3 Cibles `make seed` / `make seed-reset`, et mention dans le README.
- 7.4 Tests : le générateur produit des valeurs valides pour chaque type ; le seed laisse ≥ 500 contacts.

**Critère de fin** : `make seed` sur une base neuve donne 1000 contacts consultables via l'API.

### Phase 8 — Socle frontend [R20]

- 8.1 Application Vite + React + TypeScript strict, CSS Modules, aucune dépendance interdite
  (vérification automatique : le build échoue si Tailwind ou une grille prête à l'emploi apparaît dans `package.json`).
- 8.2 `styles/tokens.css` (couleurs, espacements, tailles de cellule) et styles de base.
- 8.3 Client API : `fetch` typé, schémas zod, erreurs typées (§6.3).
- 8.4 `QueryClientProvider`, politique de retry, `ErrorBoundary` racine, système de toasts.
- 8.5 Hooks : `useColumns`, `useContactsInfinite` (paramètres de tri/filtre dans la clé de requête).
- 8.6 Mock MSW partagé par les tests et le développement.

**Critère de fin** : l'application affiche la liste des colonnes réelle venant de l'API.

### Phase 9 — Registre de types côté front [R13, R16]

- 9.1 Contrat `ColumnTypeUi` : `format` (affichage), `parseInput` (saisie → valeur), `validate`, `Editor`,
  `FilterInput`, `alignment`.
- 9.2 Implémentations texte, nombre (aligné à droite), date (sélecteur + format local), téléphone (format lisible).
- 9.3 Tests unitaires (cas partagés avec le back : test de contrat).

**Critère de fin** : chaque type s'affiche, se saisit et se valide de manière cohérente.

### Phase 10 — Grille : affichage et scroll infini [R1, R2, R14]

- 10.1 Composants `Grid`, `HeaderRow`, `Row`, `Cell` (lecture seule), en-tête collant, colonnes de largeur fixe.
- 10.2 Virtualisation des lignes avec TanStack Virtual, dimensionnée par `total`.
- 10.3 Chargement de la page suivante près du bas ; lignes squelette ; état vide ; état d'erreur avec « Réessayer ».
- 10.4 Compteur « N contacts » affiché.
- 10.5 Tests Vitest : première page, pages suivantes, erreur de chargement. Premier scénario E2E : défiler jusqu'au
  contact n° 500.

**Critère de fin** : 1000 contacts fluides, seul un petit nombre de lignes dans le DOM.

### Phase 11 — Édition en cellule [R4, R6, R16]

- 11.1 Réducteur pur de l'état de grille (cellule active, mode édition, erreur de cellule) + tests.
- 11.2 Clavier : flèches, Entrée (éditer/valider), Échap (annuler), Tab, Suppr (vider).
- 11.3 Éditeur propre à chaque type (registre front).
- 11.4 Mutation optimiste `PATCH` avec retour arrière et erreur affichée dans la cellule (§6.3).
- 11.5 Tests : saisie valide, saisie invalide, annulation, échec serveur.

**Critère de fin** : modifier une valeur, recharger la page, la retrouver.

### Phase 12 — Tri et filtre [R7, R8, R15, R16]

- 12.1 Menu d'en-tête : tri croissant / décroissant / aucun, indicateur visuel.
- 12.2 Barre de filtres : ajout/retrait de filtres, opérateurs et champ de saisie selon le type.
- 12.3 Paramètres de tri/filtre dans la clé de requête → rechargement depuis la page 1, retour en haut de la grille.
- 12.4 Sauvegarde du tri/filtre dans l'URL (partageable, survit au rechargement).
- 12.5 Tests : chaque type de colonne, plusieurs filtres combinés, E2E « le tri porte sur tout le jeu de données ».

**Critère de fin** : trier par score décroissant affiche le vrai maximum, même sans avoir défilé.

### Phase 13 — Gestion des colonnes [R9, R10, R11, R12, R13, R14]

- 13.1 Dialogue d'ajout (nom + type), validation côté client et affichage des erreurs serveur.
- 13.2 Renommage en place depuis l'en-tête.
- 13.3 Suppression avec confirmation ; nettoyage du tri/filtre qui référençait la colonne.
- 13.4 Réorganisation par glisser-déposer (dnd-kit) avec alternative clavier ; mise à jour optimiste, retour arrière en cas d'échec.
- 13.5 Tests et E2E : l'ordre est conservé après rechargement.

**Critère de fin** : le cycle complet d'une colonne personnalisée fonctionne et persiste.

### Phase 14 — Gestion des contacts [R3, R5]

- 14.1 Ligne « + » en bas de grille, nouveau contact créé et mis en édition.
- 14.2 Suppression d'une ligne (action de ligne + confirmation).
- 14.3 Mise à jour du cache et du `total` sans rechargement complet.
- 14.4 Tests Vitest et E2E.

**Critère de fin** : ajouter, modifier et supprimer un contact fonctionne de bout en bout.

### Phase 15 — E2E, traçabilité et finition [R18, R19]

- 15.1 Playwright contre `docker compose` : un scénario par exigence R1 à R17.
- 15.2 Script `test-matrix` : génère `docs/TESTING.md` à partir des tags `[Rxx]`, échoue si une exigence n'a aucun test.
- 15.3 Seuils de couverture, rapport HTML.
- 15.4 Recettes `docs/recipes/` (§3.4) rédigées à partir du code réel.
- 15.5 Pipeline CI (lint, typecheck, tests, build des images).
- 15.6 Relecture du README par une personne qui n'a jamais lancé le projet : `git clone` → application fonctionnelle en
  moins de 5 minutes.

**Critère de fin** : la matrice montre R1 à R20 couverts ; un nouvel arrivant lance le projet avec le README seul.

---

## 10. Hors périmètre et hypothèses

- **Hors périmètre** (voir §8 pour les accroches) : authentification, temps réel, formules, sélection et collage
  multi-cellules, CSV, undo/redo, responsive mobile avancé, déploiement cloud, fidélité visuelle à Google Sheets.
- Le **type d'une colonne est immuable** après création : le changer impose de convertir toutes les valeurs, avec
  risque de perte. La recette de conversion pourra être ajoutée plus tard.
- Interface en **français**. Pagination par pages de **50** lignes. Seed de **1000** contacts.
- Un seul « espace de travail » : un jeu unique de colonnes et de contacts.
- Téléphone : validation tolérante (6 à 15 chiffres, `+` initial optionnel), sans bibliothèque de numéros
  internationaux. Passer à `libphonenumber-js` reste possible, car la logique est isolée dans un seul fichier.
- Les doublons de contacts ne sont pas détectés.
