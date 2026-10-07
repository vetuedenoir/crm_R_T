# Règles de code et de développement

Ces règles s'appliquent à tout le dépôt (`backend/`, `frontend/`, `e2e/`). Elles sont **vérifiées par
l'outillage** (ESLint, `tsc`, CI) chaque fois que c'est possible. Le détail des choix et leurs
alternatives écartées sont dans [`docs/PLAN.md`](../docs/PLAN.md).

## 1. Principes

1. **Cœur fonctionnel, coquille impérative** : la logique métier est en fonctions pures, les effets
   (base, HTTP, DOM) vivent dans une fine couche autour.
2. **Typage strict** : le compilateur est la première ligne de défense.
3. **Une erreur attendue est une valeur, une erreur inattendue est une exception, aucune ne disparaît en
   silence.**
4. **Le code sert de gabarit** : un motif récurrent a une seule implémentation de référence.
5. **Simplicité** : on n'écrit pas ce dont on n'a pas encore besoin (pas de générateur, pas de package
   partagé, pas de store global tant que ce n'est pas justifié).

## 2. Fonctions pures

- Toute la logique métier (validation d'une valeur, normalisation, construction du SQL, assemblage des
  contacts, calcul de l'ordre des colonnes) est en **fonction pure** : mêmes entrées, mêmes sorties, aucun
  effet de bord.
- Une fonction pure n'accède ni à la base, ni à l'horloge, ni au hasard, ni à `process.env`, et n'importe
  rien de NestJS ou de React. Temps, identifiants et aléatoire sont **passés en paramètres**.
- Les services Nest et les hooks React appellent le cœur pur et **ne contiennent pas de règle métier**.
- Pas de mutation : `readonly`, `ReadonlyArray`, `as const`, copies par spread.
- Pas de `throw` pour un cas attendu : retourner un `Result<T, E>` (§5).

## 3. TypeScript

- `tsconfig` : `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride`,
  `noFallthroughCasesInSwitch`, `noUnusedLocals`, `noUnusedParameters`.
- `any` interdit (`@typescript-eslint/no-explicit-any` en erreur). Toute entrée externe (JSON réseau, corps
  de requête, ligne SQL) est `unknown` jusqu'à validation.
- `as` et `!` (non-null) interdits, sauf commentaire justifiant le cas.
- **Types nominaux (branded)** pour les identifiants : `ColumnId` et `ContactId` ne sont interchangeables ni
  avec un `string`, ni entre eux.
- **Unions discriminées** pour tout ce qui varie selon le type de colonne ; tout `switch` sur `type` est
  exhaustif (garde `never`). Ajouter un type de colonne doit faire échouer la compilation partout où il est
  oublié.
- Types de retour **explicites** sur toute fonction exportée.

## 4. Norme de code

| Sujet | Règle |
|---|---|
| Format | Prettier (config unique à la racine) + EditorConfig |
| Lint | `typescript-eslint` en `strict-type-checked`, `eslint-plugin-import` (ordre des imports) |
| Fichiers | `kebab-case.ts` ; un concept par fichier ; `*.spec.ts` / `*.test.ts` à côté du code testé |
| Nommage | `PascalCase` types/classes/composants, `camelCase` fonctions/variables, `SCREAMING_SNAKE_CASE` constantes globales |
| Taille | Fonction ≤ 40 lignes, complexité cyclomatique ≤ 10, fichier ≤ 300 lignes |
| Exports | Exports nommés uniquement (pas de `export default`), un `index.ts` public par module |
| Dépendances | Un module ne dépend que de ce que expose l'`index.ts` d'un autre ; la logique pure ne dépend jamais des couches d'effets |
| Commentaires | On commente le **pourquoi**, jamais le « quoi » |
| `catch` | Jamais de `catch {}` vide (règle ESLint) |

### Forme uniforme des modules (gabarit)

Tout module Nest a la même forme : `*.module.ts`, `*.controller.ts`, `*.service.ts`, `*.dto.ts`, `*.pure.ts`,
`*.spec.ts`. Copier un module existant suffit pour en créer un nouveau. Les motifs récurrents ont une recette
dans `docs/recipes/` : ajouter un type de colonne, un endpoint REST, un opérateur de filtre, un composant de
cellule ou un éditeur.

## 5. Gestion des erreurs

### Cœur pur

```ts
type Result<T, E> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E };
```

L'appelant est forcé par le compilateur de traiter l'échec.

### Backend

- Erreurs métier typées `AppError` avec `code` stable, message, détails, statut HTTP : `VALIDATION_FAILED`
  (422), `COLUMN_NOT_FOUND` / `CONTACT_NOT_FOUND` (404), `INVALID_FILTER` / `INVALID_SORT` (400),
  `CONFLICT` (409), `INTERNAL` (500).
- **Un seul `ExceptionFilter` global**, réponse uniforme :
  `{ "error": { "code", "message", "details", "requestId" } }`. Il traduit aussi les erreurs du
  `ValidationPipe` et de PostgreSQL. **Aucun détail interne** (stack, SQL) n'est exposé.
- Configuration validée au démarrage : variable manquante ou invalide = l'API refuse de démarrer.
- **Transaction** pour toute opération multi-lignes (suppression de colonne, réordonnancement, création de
  contact avec ses cellules).
- Journalisation structurée avec `requestId` ; 5xx loguées avec stack, 4xx en `warn`.
- `enableShutdownHooks` pour un arrêt propre.

### Frontend

- Toute réponse d'API passe par un **schéma zod** à la frontière réseau ; échec = `ApiError` typée
  (`NetworkError`, `ValidationApiError`, `NotFoundError`, `ServerError`), jamais un `undefined` plus loin.
- Valeur de cellule rejetée (422) : retour arrière du cache optimiste, cellule surlignée avec le message du
  serveur, la saisie n'est pas perdue.
- Erreur de chargement : état d'erreur avec « Réessayer ». `ErrorBoundary` autour de la grille. Toasts pour
  les erreurs hors cellule.

## 6. Données et SQL

- Modèle **EAV typé** : une ligne par cellule dans `cells`, une seule colonne de valeur renseignée
  (`value_text`, `value_number` ou `value_date`), garantie par un `CHECK`.
- **Cellule vide = pas de ligne.** Vider une cellule supprime la ligne ; le filtre « vide » = `NOT EXISTS`.
- Le **type d'une colonne est immuable** après création.
- Colonnes par défaut = vraies lignes de `columns` créées par migration : aucun cas particulier entre
  colonnes natives et personnalisées.
- Le SQL de liste (tri, filtres, pagination, total) est produit par **une seule fonction pure**
  `buildContactsQuery(query, columns) → Result<{ sql, params }, QueryError>`, sans QueryBuilder.
- **Tout identifiant SQL vient de la table `columns`, jamais du client. Toute valeur est un paramètre lié.**
  Jamais de concaténation de données utilisateur dans le SQL.
- Pagination `limit` + `offset` avec tri stable (départage par `contacts.id`) et `total`.
- Migrations TypeORM versionnées et réversibles ; **pas de `synchronize`** hors tests.
- Les dépôts (repositories) font de l'accès brut, sans règle métier.

## 7. Validation

Deux couches, volontairement séparées :

1. **Forme de la requête** (types JSON, UUID, bornes de pagination) : `class-validator` + `ValidationPipe`
   strict (`whitelist`, `forbidNonWhitelisted`).
2. **Valeur d'une cellule** (dépend du type de colonne) : registre de types, fonction pure retournant un
   `Result`.

**Registre de types de colonnes** : chaque type implémente le contrat `ColumnTypeDefinition`
(`name`, `storage`, `filterOperators`, `parse`, `compare`, `serialize`). C'est le seul endroit où un type est
défini. Ajouter un type = un fichier + une entrée dans le registre. Le front a son pendant (`ColumnTypeUi` :
affichage, éditeur, saisie du filtre) ; le **back reste la source de vérité**. Pas de package partagé
front/back : la cohérence est vérifiée par des **tests de contrat** (jeu de cas JSON commun).

## 8. Frontend

- React + Vite + TypeScript strict, **CSS Modules**. **Interdits** : Tailwind, grille ou tableur prêt à
  l'emploi (le build échoue si l'un apparaît dans `package.json`).
- Primitives autorisées : TanStack Query, TanStack Virtual, dnd-kit, zod.
- Couleurs, espacements et tailles de cellule en **variables CSS** (`styles/tokens.css`) ; aucune taille en
  dur dans les composants.
- État serveur dans TanStack Query uniquement. État d'interface (cellule active, édition, sélection) dans un
  `useReducer` dont le **réducteur est pur** et testé seul. Pas de store global, pas de librairie de
  formulaires.
- Les paramètres de tri/filtre font partie de la clé de requête et sont sauvegardés dans l'URL.
- Mises à jour optimistes avec retour arrière en cas d'erreur serveur.
- Accessibilité : opérations au glisser-déposer toujours accompagnées d'une alternative clavier.
- Interface en **français**. Pages de **50** lignes.

## 9. Tests

| Niveau | Outils | Portée |
|---|---|---|
| Unitaire back (pur) | Jest, `it.each` | Registre de types, `buildContactsQuery`, `assembleContacts`, ordre des colonnes |
| Intégration back | Jest + supertest + **vrai PostgreSQL** (`crm_test`) | Endpoints, migrations, SQL réel, transactions |
| Unitaire front | Vitest + Testing Library + MSW | Registre front, réducteur, éditeurs, filtres, scroll infini |
| Contrat | Jeu de cas JSON partagé | Mêmes valeurs acceptées/rejetées des deux côtés |
| E2E | Playwright sur la stack Docker | Un scénario par exigence utilisateur |

- **Titre de test = exigence + comportement** : `[R15] trie sur l'ensemble des données, pas sur la page`.
  Les tags `[Rxx]` alimentent la matrice `docs/TESTING.md` (`make test-matrix`) ; une exigence sans test fait
  échouer la CI.
- Pas de mock de la base pour la logique SQL : on teste contre un vrai PostgreSQL.
- Données de test via des fabriques (`buildColumn()`, `buildContact()`) : un test ne précise que ce qui compte.
- Couverture ≥ **90 %** sur le code pur.
- Cas critiques obligatoires : tri/filtre sur tout le jeu de données (500 contacts) et `total` correct ;
  nombres triés numériquement (`9 < 10`) ; dates chronologiques ; texte insensible à la casse ; vides en
  dernier ; suppression de colonne en cascade ; ordre des colonnes persistant ; valeur invalide → 422 par
  cellule ; injection (nom de colonne ou valeur hostile).
- Un bug corrigé = un test de non-régression.

## 10. Workflow

- **Commandes** : `make up | down | seed | seed-reset | lint | typecheck | test | test-back | test-front |
  test-e2e | test-matrix`.
- `make lint` et `make typecheck` passent **avant chaque commit** ; on n'avance à la phase suivante du plan que
  lorsque `make lint typecheck test` est vert.
- **Conventional Commits** : `feat:`, `fix:`, `test:`, `docs:`, `refactor:` (vérifié par commitlint).
- Configuration par variables d'environnement (`.env.example` tenu à jour), API sans état, `/api/health`.
- Le seed est reproductible (graine `faker` fixe), idempotent, **1000 contacts**, et refuse de tourner en
  production sans `--force`.
- Le README permet à une personne qui n'a jamais lancé le projet de passer de `git clone` à une application
  fonctionnelle en moins de 5 minutes.
- **Agents (IA)** : l'agent ne commit jamais lui-même (`git add`, `git commit`, `git push` interdits) ; il
  propose le message de commit dans sa réponse et l'utilisateur commite.
