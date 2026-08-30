module.exports = [
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'commonjs',
      globals: {
        require: 'readonly',
        module: 'readonly',
        exports: 'readonly',
        process: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        describe: 'readonly',
        it: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        jest: 'readonly',
      },
    },
    rules: {
      'no-console': 'off',
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_|next' }],
      'no-process-exit': 'off',
      'prefer-const': 'error',
      'no-var': 'error',
      eqeqeq: 'error',
      curly: 'error',
    },
  },
  {
    ignores: ['node_modules/**', 'coverage/**', 'frontend/**', 'dist/**'],
  },
];
