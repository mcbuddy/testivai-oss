// This file isolates the Playwright-specific types for the reporter
// to allow for clean mocking in the Jest test environment.
import type { Reporter, FullConfig, Suite, FullResult } from '@playwright/test/reporter';

export type { Reporter, FullConfig, Suite, FullResult };
