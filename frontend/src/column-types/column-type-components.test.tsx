import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { CellEditorProps } from './column-type-ui';
import { COLUMN_TYPE_UI } from './registry';

function renderEditor(
  type: keyof typeof COLUMN_TYPE_UI,
  overrides: Partial<CellEditorProps> = {},
): CellEditorProps {
  const props: CellEditorProps = {
    draft: '',
    label: 'Score',
    invalid: false,
    onDraftChange: vi.fn(),
    onCommit: vi.fn(),
    onCancel: vi.fn(),
    ...overrides,
  };
  const { Editor } = COLUMN_TYPE_UI[type];
  render(<Editor {...props} />);
  return props;
}

describe('éditeur de cellule', () => {
  it.each([
    ['text', 'text', 'text'],
    ['number', 'text', 'decimal'],
    ['date', 'date', 'text'],
    ['phone', 'tel', 'tel'],
  ] as const)(
    '[R16] le type %s utilise un champ « %s » avec le clavier « %s »',
    (type, inputType, inputMode) => {
      renderEditor(type);

      const input = screen.getByLabelText('Score');
      expect(input).toHaveAttribute('type', inputType);
      expect(input).toHaveAttribute('inputmode', inputMode);
    },
  );

  it('[R6] affiche le brouillon, a le focus, et signale chaque frappe', async () => {
    const props = renderEditor('text', { draft: 'Al' });

    const input = screen.getByLabelText('Score');
    expect(input).toHaveValue('Al');
    expect(input).toHaveFocus();
    await userEvent.type(input, 'i');

    expect(props.onDraftChange).toHaveBeenCalledWith('Ali');
  });

  it('[R6] la date se saisit au format ISO, celui d’un sélecteur de date', () => {
    const props = renderEditor('date');

    fireEvent.change(screen.getByLabelText('Score'), { target: { value: '2024-06-15' } });

    expect(props.onDraftChange).toHaveBeenCalledWith('2024-06-15');
  });

  it('[R6] Entrée valide la saisie et Échap l’annule', async () => {
    const props = renderEditor('number', { draft: '12' });
    await userEvent.type(screen.getByLabelText('Score'), '{Enter}');

    expect(props.onCommit).toHaveBeenCalledTimes(1);
    expect(props.onCancel).not.toHaveBeenCalled();

    await userEvent.type(screen.getByLabelText('Score'), '{Escape}');

    expect(props.onCancel).toHaveBeenCalledTimes(1);
  });

  it('[R16] marque le champ invalide pour les technologies d’assistance', () => {
    renderEditor('number', { draft: 'abc', invalid: true });

    expect(screen.getByLabelText('Score')).toHaveAttribute('aria-invalid', 'true');
  });
});

describe('champs de filtre', () => {
  function renderFilter(
    type: keyof typeof COLUMN_TYPE_UI,
    operator: Parameters<typeof COLUMN_TYPE_UI.text.parseFilterValues>[0],
    values: ReadonlyArray<string> = [],
  ): ReadonlyArray<string>[] {
    const changes: ReadonlyArray<string>[] = [];
    const { FilterInput } = COLUMN_TYPE_UI[type];
    render(
      <FilterInput
        operator={operator}
        values={values}
        label="Score"
        onChange={(next) => changes.push(next)}
      />,
    );
    return changes;
  }

  it.each([
    ['isEmpty', 0],
    ['equals', 1],
    ['between', 2],
  ] as const)('[R8] l’opérateur %s affiche %i champ(s)', (operator, count) => {
    renderFilter('number', operator);

    expect(screen.queryAllByRole('textbox')).toHaveLength(count);
  });

  it('[R8] « entre » distingue le minimum et le maximum', () => {
    renderFilter('number', 'between', ['1', '10']);

    expect(screen.getByLabelText('Score (minimum)')).toHaveValue('1');
    expect(screen.getByLabelText('Score (maximum)')).toHaveValue('10');
  });

  it('[R8] modifier un champ renvoie la liste complète des valeurs', async () => {
    const changes = renderFilter('number', 'between', ['1', '10']);

    await userEvent.type(screen.getByLabelText('Score (maximum)'), '0');

    expect(changes).toEqual([['1', '100']]);
  });

  it('[R8] la date se filtre avec un sélecteur de date', () => {
    renderFilter('date', 'before');

    expect(screen.getByLabelText('Score')).toHaveAttribute('type', 'date');
  });
});
