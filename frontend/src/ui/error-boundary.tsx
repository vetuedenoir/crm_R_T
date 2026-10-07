import { Component, type ErrorInfo, type ReactNode } from 'react';

import { ErrorState } from './error-state';

interface ErrorBoundaryProps {
  readonly children: ReactNode;
  // Message affiché à la place de `children` quand un composant plante au rendu.
  readonly message?: string;
}

interface ErrorBoundaryState {
  readonly failed: boolean;
}

const DEFAULT_MESSAGE = "Une erreur est survenue lors de l'affichage.";

// Une erreur de rendu n'écrase pas toute l'application (RULES §5). React n'offre cette garde que par
// une classe : c'est la seule du projet.
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { failed: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { failed: true };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error(error, info.componentStack);
  }

  override render(): ReactNode {
    if (this.state.failed) {
      return (
        <ErrorState
          message={this.props.message ?? DEFAULT_MESSAGE}
          onRetry={() => {
            this.setState({ failed: false });
          }}
        />
      );
    }
    return this.props.children;
  }
}
