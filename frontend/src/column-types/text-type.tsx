import type { ReactNode } from 'react';

import type { CellEditorProps, ColumnTypeUi, FilterInputProps } from './column-type-ui';
import { FilterFields } from './filter-fields';
import type { InputAttrs } from './input-attrs';
import { InputEditor } from './input-editor';
import { TEXT_LOGIC } from './text-type.pure';

const INPUT_ATTRS: InputAttrs = {
  type: 'text',
  inputMode: 'text',
  alignment: TEXT_LOGIC.alignment,
};

function TextEditor(props: CellEditorProps): ReactNode {
  return <InputEditor {...props} attrs={INPUT_ATTRS} />;
}

function TextFilterInput(props: FilterInputProps): ReactNode {
  return <FilterFields {...props} attrs={INPUT_ATTRS} />;
}

export const TEXT_TYPE_UI: ColumnTypeUi<'text'> = {
  ...TEXT_LOGIC,
  Editor: TextEditor,
  FilterInput: TextFilterInput,
};
