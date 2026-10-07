export type ToastKind = 'error' | 'success';

export interface Toast {
  readonly id: string;
  readonly kind: ToastKind;
  readonly message: string;
}

export type ToastAction =
  | { readonly type: 'added'; readonly toast: Toast }
  | { readonly type: 'dismissed'; readonly id: string };

// Au-delà, les plus anciens disparaissent : une rafale d'erreurs ne doit pas couvrir l'écran.
export const MAX_VISIBLE_TOASTS = 5;

// L'identifiant vient de l'action : le réducteur ne génère rien lui-même (RULES §2).
export function toastReducer(
  state: ReadonlyArray<Toast>,
  action: ToastAction,
): ReadonlyArray<Toast> {
  switch (action.type) {
    case 'added':
      return [...state, action.toast].slice(-MAX_VISIBLE_TOASTS);
    case 'dismissed':
      return state.filter((toast) => toast.id !== action.id);
  }
}
