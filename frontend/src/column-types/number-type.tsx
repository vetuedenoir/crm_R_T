import type { ReactNode } from 'react';

import type { CellEditorProps, ColumnTypeUi, FilterInputProps } from './column-type-ui';
import { FilterFields } from './filter-fields';
import type { InputAttrs } from './input-attrs';
import { InputEditor } from './input-editor';
import { NUMBER_LOGIC } from './number-type.pure';

const INPUT_ATTRS: InputAttrs = {
  type: 'text',
  inputMode: 'decimal',
  alignment: NUMBER_LOGIC.alignment,
};

function NumberEditor(props: CellEditorProps): ReactNode {
  return <InputEditor {...props} attrs={INPUT_ATTRS} />;
}

function NumberFilterInput(props: FilterInputProps): ReactNode {
  return <FilterFields {...props} attrs={INPUT_ATTRS} />;
}

export const NUMBER_TYPE_UI: ColumnTypeUi<'number'> = {
  ...NUMBER_LOGIC,
  Editor: NumberEditor,
  FilterInput: NumberFilterInput,
};
