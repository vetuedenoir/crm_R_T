import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from './app';
import './styles/tokens.css';
import './styles/base.css';

// Mode `mock` (`npm run dev:mock`) : MSW répond à la place de l'API, sans backend ni base.
async function enableMocking(): Promise<void> {
  if (import.meta.env.MODE !== 'mock') {
    return;
  }
  const { worker } = await import('./mocks/browser');
  await worker.start({ onUnhandledFrame: 'bypass' });
}

const root = document.getElementById('root');
if (root === null) {
  throw new Error('Élément #root introuvable dans index.html');
}

void enableMocking().then(() => {
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
});
