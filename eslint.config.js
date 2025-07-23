// ESLint configuration for GuardianPulse monorepo
// This is a minimal configuration to satisfy ESLint v9 requirements

export default [
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**', 
      '**/build/**',
      '**/coverage/**',
      '**/.next/**',
      '**/generated/**',
      '**/src/generated/**',
      'packages/*/src/generated/**',
    ],
  },
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
    },
    rules: {
      // Minimal rules - packages have their own specific ESLint configs
      'no-unused-vars': 'warn',
      'no-console': 'off',
    },
  },
];
