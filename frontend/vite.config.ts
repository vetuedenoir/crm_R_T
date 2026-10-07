import { fileURLToPath } from 'node:url';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

import { forbiddenDependenciesPlugin } from './tooling/forbidden-dependencies-plugin.ts';

// En développement, l'API tourne sur la machine hôte (voir README) ; nginx jouera ce rôle dans Docker.
const API_TARGET = process.env['API_PROXY_TARGET'] ?? 'http://localhost:3000';

export default defineConfig({
  plugins: [
    react(),
    forbiddenDependenciesPlugin(fileURLToPath(new URL('./package.json', import.meta.url))),
  ],
  server: { proxy: { '/api': API_TARGET } },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}', 'tooling/**/*.test.ts'],
  },
});
