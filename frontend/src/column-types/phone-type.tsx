import type { ReactNode } from 'react';

import type { CellEditorProps, ColumnTypeUi, FilterInputProps } from './column-type-ui';
import { FilterFields } from './filter-fields';
import type { InputAttrs } from './input-attrs';
import { InputEditor } from './input-editor';
import { PHONE_LOGIC } from './phone-type.pure';

const INPUT_ATTRS: InputAttrs = {
  type: 'tel',
  inputMode: 'tel',
  alignment: PHONE_LOGIC.alignment,
};

function PhoneEditor(props: CellEditorProps): ReactNode {
  return <InputEditor {...props} attrs={INPUT_ATTRS} />;
}

function PhoneFilterInput(props: FilterInputProps): ReactNode {
  return <FilterFields {...props} attrs={INPUT_ATTRS} />;
}

export const PHONE_TYPE_UI: ColumnTypeUi<'phone'> = {
  ...PHONE_LOGIC,
  Editor: PhoneEditor,
  FilterInput: PhoneFilterInput,
};
