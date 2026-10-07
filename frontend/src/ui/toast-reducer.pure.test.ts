import { describe, expect, it } from 'vitest';

import { MAX_VISIBLE_TOASTS, toastReducer, type Toast } from './toast-reducer.pure';

function toast(id: string): Toast {
  return { id, kind: 'error', message: `Message ${id}` };
}

describe('toastReducer', () => {
  it('ajoute une notification à la fin', () => {
    expect(toastReducer([toast('1')], { type: 'added', toast: toast('2') })).toEqual([
      toast('1'),
      toast('2'),
    ]);
  });

  it('retire la notification fermée et laisse les autres', () => {
    expect(toastReducer([toast('1'), toast('2')], { type: 'dismissed', id: '1' })).toEqual([
      toast('2'),
    ]);
  });

  it('ignore la fermeture d’une notification déjà disparue', () => {
    expect(toastReducer([toast('1')], { type: 'dismissed', id: 'absente' })).toEqual([toast('1')]);
  });

  it('supprime les plus anciennes au-delà du maximum affiché', () => {
    const full = Array.from({ length: MAX_VISIBLE_TOASTS }, (_unused, index) =>
      toast(String(index)),
    );

    const next = toastReducer(full, { type: 'added', toast: toast('nouvelle') });

    expect(next).toHaveLength(MAX_VISIBLE_TOASTS);
    expect(next[0]).toEqual(toast('1'));
    expect(next.at(-1)).toEqual(toast('nouvelle'));
  });

  it('ne modifie pas l’état reçu', () => {
    const state = [toast('1')];

    toastReducer(state, { type: 'added', toast: toast('2') });

    expect(state).toEqual([toast('1')]);
  });
});
