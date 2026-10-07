// Un identifiant entrant n'est repris que s'il est sûr à journaliser (pas de retour à la ligne, taille bornée).
const SAFE_REQUEST_ID = /^[\w.-]{1,64}$/;

export function resolveRequestId(incoming: unknown, generate: () => string): string {
  return typeof incoming === 'string' && SAFE_REQUEST_ID.test(incoming) ? incoming : generate();
}
