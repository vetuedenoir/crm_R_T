export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // Types du plan (§3.3 / RULES.md §10) + `chore` pour l'outillage et la structure du dépôt.
    'type-enum': [2, 'always', ['feat', 'fix', 'test', 'docs', 'refactor', 'chore']],
  },
};
