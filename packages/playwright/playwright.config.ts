import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './__tests__',
  // We don't need a reporter for this test run
  reporter: 'list',
  use: {
    // Basic browser configuration
    browserName: 'chromium',
  },
});
