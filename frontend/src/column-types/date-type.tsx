import type { ReactNode } from 'react';

import type { CellEditorProps, ColumnTypeUi, FilterInputProps } from './column-type-ui';
import { DATE_LOGIC } from './date-type.pure';
import { FilterFields } from './filter-fields';
import type { InputAttrs } from './input-attrs';
import { InputEditor } from './input-editor';

const INPUT_ATTRS: InputAttrs = {
  type: 'date',
  inputMode: 'text',
  alignment: DATE_LOGIC.alignment,
};

function DateEditor(props: CellEditorProps): ReactNode {
  return <InputEditor {...props} attrs={INPUT_ATTRS} />;
}

function DateFilterInput(props: FilterInputProps): ReactNode {
  return <FilterFields {...props} attrs={INPUT_ATTRS} />;
}

export const DATE_TYPE_UI: ColumnTypeUi<'date'> = {
  ...DATE_LOGIC,
  Editor: DateEditor,
  FilterInput: DateFilterInput,
};
