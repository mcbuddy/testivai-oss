/**
 * @testivai/witness-webdriverio — WDIO service
 *
 * Registered in wdio.conf.ts so the report is generated automatically
 * after the test suite finishes:
 *
 *   import { TestivaiService } from '@testivai/witness-webdriverio/service';
 *
 *   export const config = {
 *     services: [[TestivaiService, { quiet: false }]],
 *     // ...
 *   };
 *
 * The service does ONE thing in `onComplete`: call `generateReport()`
 * from @testivai/witness/report.
 */

import { generateReport } from '@testivai/witness';
import type { TestivaiServiceOptions } from './types';

export class TestivaiService {
  private readonly options: TestivaiServiceOptions;

  constructor(serviceOptions: TestivaiServiceOptions = {}) {
    this.options = serviceOptions;
  }

  /**
   * WebdriverIO calls onComplete after all worker processes finish.
   * Signature is intentionally loose — we only consume the parts we need
   * and remain forward-compatible with WDIO 8 and 9.
   */
  async onComplete(
    _exitCode?: number,
    _config?: unknown,
    _capabilities?: unknown,
    _results?: unknown,
  ): Promise<void> {
    const projectRoot = this.options.projectRoot ?? process.cwd();
    const log = (msg: string): void => {
      if (!this.options.quiet) {
        // eslint-disable-next-line no-console
        console.log(`[testivai] ${msg}`);
      }
    };

    try {
      const reportData = generateReport({
        projectRoot,
        reportDir: this.options.reportDir,
        threshold: this.options.threshold,
        autoOpen: this.options.autoOpen ?? false,
      });

      const { summary } = reportData;
      log(
        `Visual report: total=${summary.total} passed=${summary.passed} ` +
          `changed=${summary.changed} new=${summary.newSnapshots}`,
      );
      if (summary.changed > 0 || summary.newSnapshots > 0) {
        log('To approve: npx testivai approve --all');
      }
    } catch (err: unknown) {
      // Reporting failure must not crash the WDIO run after all tests
      // already passed. Log and exit cleanly.
      // eslint-disable-next-line no-console
      console.error('[testivai] Failed to generate visual report:', err);
    }
  }
}

/**
 * Default export so consumers can use the WDIO services-by-class form
 * directly: `services: [TestivaiService]`. The class form is also
 * compatible with the tuple form for passing options.
 */
export default TestivaiService;
