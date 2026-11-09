// React application lint rules for source files and Jest test files.
// Keep Jest globals scoped to tests without loading the optional
// react-app/jest preset during production builds.
module.exports = {
  extends: ['react-app'],
  overrides: [
    {
      files: [
        '**/__tests__/**/*.{js,jsx,ts,tsx}',
        '**/*.{test,spec}.{js,jsx,ts,tsx}',
        '**/setupTests.{js,jsx,ts,tsx}',
      ],
      env: { jest: true },
    },
  ],
};
