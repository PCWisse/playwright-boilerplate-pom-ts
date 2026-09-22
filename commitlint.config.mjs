/**
 * Conventional Commits, with a scope allowlist matching this repository's
 * directories. commitlint only validates NEW commits, so widening or
 * narrowing this list never invalidates existing history.
 */
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'scope-enum': [2, 'always', ['api', 'a11y', 'ci', 'components', 'config', 'demo-app', 'deps', 'docker', 'docs', 'fixtures', 'plan', 'reporting', 'ui', 'visual']],
    'header-max-length': [2, 'always', 100],
  },
};
