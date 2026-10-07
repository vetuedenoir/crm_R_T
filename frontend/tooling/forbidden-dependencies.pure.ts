export interface ForbiddenDependency {
  readonly name: string;
  readonly reason: string;
}

interface ForbiddenRule {
  readonly pattern: RegExp;
  readonly reason: string;
}

const TAILWIND_REASON = 'Tailwind est interdit (R20) : les styles sont des CSS Modules';
const GRID_REASON =
  'Une grille ou un tableur prêt à l’emploi est interdit (R20) : la grille est écrite à la main';

// Les primitives autorisées (TanStack Query, TanStack Virtual, dnd-kit, zod) ne figurent pas ici.
// `@tanstack/react-table` est refusé : il fournit le modèle de colonnes et de lignes d'une grille.
const FORBIDDEN_RULES: ReadonlyArray<ForbiddenRule> = [
  { pattern: /^tailwind/, reason: TAILWIND_REASON },
  { pattern: /^@tailwindcss\//, reason: TAILWIND_REASON },
  { pattern: /^@?ag-grid/, reason: GRID_REASON },
  { pattern: /handsontable/, reason: GRID_REASON },
  { pattern: /^react-data-grid$/, reason: GRID_REASON },
  { pattern: /^@mui\/x-data-grid/, reason: GRID_REASON },
  { pattern: /glide-data-grid/, reason: GRID_REASON },
  { pattern: /reactgrid/, reason: GRID_REASON },
  { pattern: /datasheet/, reason: GRID_REASON },
  { pattern: /spreadsheet/, reason: GRID_REASON },
  { pattern: /^jexcel/, reason: GRID_REASON },
  { pattern: /fortune-sheet|luckysheet/, reason: GRID_REASON },
  { pattern: /slickgrid/, reason: GRID_REASON },
  { pattern: /revogrid|^@revolist\//, reason: GRID_REASON },
  { pattern: /^@tanstack\/(react-table|table-core)$/, reason: GRID_REASON },
];

const DEPENDENCY_SECTIONS = [
  'dependencies',
  'devDependencies',
  'peerDependencies',
  'optionalDependencies',
] as const;

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function dependencyNames(manifest: unknown): ReadonlyArray<string> {
  if (!isRecord(manifest)) {
    return [];
  }
  return DEPENDENCY_SECTIONS.flatMap((section) => {
    const dependencies = manifest[section];
    return isRecord(dependencies) ? Object.keys(dependencies) : [];
  });
}

// `manifest` est le contenu brut d'un package.json (`unknown` tant qu'il n'est pas inspecté).
export function findForbiddenDependencies(manifest: unknown): ReadonlyArray<ForbiddenDependency> {
  return dependencyNames(manifest).flatMap((name) => {
    const rule = FORBIDDEN_RULES.find(({ pattern }) => pattern.test(name));
    return rule === undefined ? [] : [{ name, reason: rule.reason }];
  });
}

export function describeForbiddenDependencies(
  violations: ReadonlyArray<ForbiddenDependency>,
): string {
  return violations.map(({ name, reason }) => `  - ${name} : ${reason}`).join('\n');
}
