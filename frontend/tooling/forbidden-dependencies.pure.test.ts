import { describe, expect, it } from 'vitest';

import manifest from '../package.json';

import {
  describeForbiddenDependencies,
  findForbiddenDependencies,
} from './forbidden-dependencies.pure';

function manifestWith(section: string, name: string): unknown {
  return { [section]: { [name]: '1.0.0' } };
}

describe('findForbiddenDependencies', () => {
  it.each([
    ['tailwindcss'],
    ['@tailwindcss/vite'],
    ['ag-grid-react'],
    ['@ag-grid-community/core'],
    ['handsontable'],
    ['@handsontable/react'],
    ['react-data-grid'],
    ['@mui/x-data-grid'],
    ['react-spreadsheet'],
    ['react-datasheet-grid'],
    ['@tanstack/react-table'],
  ])('[R20] refuse %s', (name) => {
    const violations = findForbiddenDependencies(manifestWith('dependencies', name));

    expect(violations.map((violation) => violation.name)).toEqual([name]);
    expect(violations[0]?.reason).toContain('R20');
  });

  it.each([['dependencies'], ['devDependencies'], ['peerDependencies'], ['optionalDependencies']])(
    '[R20] inspecte la section %s',
    (section) => {
      expect(findForbiddenDependencies(manifestWith(section, 'tailwindcss'))).toHaveLength(1);
    },
  );

  it.each([
    ['react'],
    ['zod'],
    ['@tanstack/react-query'],
    ['@tanstack/react-virtual'],
    ['@dnd-kit/core'],
    ['vite'],
  ])('[R20] accepte la primitive autorisée %s', (name) => {
    expect(findForbiddenDependencies(manifestWith('dependencies', name))).toEqual([]);
  });

  it.each([[null], [undefined], ['texte'], [42], [[]], [{}], [{ dependencies: 'invalide' }]])(
    'ignore un manifeste inexploitable (%j)',
    (manifest) => {
      expect(findForbiddenDependencies(manifest)).toEqual([]);
    },
  );

  it('[R20] le package.json du frontend ne contient aucune dépendance interdite', () => {
    expect(findForbiddenDependencies(manifest)).toEqual([]);
  });
});

describe('describeForbiddenDependencies', () => {
  it('liste une dépendance par ligne avec sa raison', () => {
    const message = describeForbiddenDependencies([
      { name: 'tailwindcss', reason: 'raison A' },
      { name: 'ag-grid-react', reason: 'raison B' },
    ]);

    expect(message).toBe('  - tailwindcss : raison A\n  - ag-grid-react : raison B');
  });
});
