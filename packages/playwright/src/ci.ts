/**
 * Utilities for detecting CI/CD environments and extracting a unique run identifier.
 */

/**
 * CI environment information for integration feedback (e.g., GitHub commit statuses, PR comments).
 */
export interface CiInfo {
  /** CI provider name */
  provider: string;
  /** Pull/Merge request number (if available) */
  prNumber?: number;
  /** URL to the CI run (if available) */
  runUrl?: string;
  /** CI build/run identifier */
  buildId?: string;
}

/**
 * Gets a unique identifier for the current CI run.
 * This ID is used to group snapshots from parallel shards into a single batch.
 *
 * @returns A unique string identifier for the CI run, or null if not in a known CI environment.
 */
export function getCiRunId(): string | null {
  // GitHub Actions
  if (process.env.GITHUB_RUN_ID) {
    return `github-${process.env.GITHUB_RUN_ID}`;
  }
  // GitLab CI
  if (process.env.GITLAB_CI) {
    return `gitlab-${process.env.CI_PIPELINE_ID}`;
  }
  // Jenkins
  if (process.env.JENKINS_URL) {
    return `jenkins-${process.env.BUILD_ID}`;
  }
  // CircleCI
  if (process.env.CIRCLECI) {
    return `circleci-${process.env.CIRCLE_WORKFLOW_ID}`;
  }
  // Travis CI
  if (process.env.TRAVIS) {
    return `travis-${process.env.TRAVIS_BUILD_ID}`;
  }

  return null;
}

/**
 * Gets detailed CI environment information including PR number and run URL.
 * Used for integration feedback (GitHub commit statuses, PR comments, etc.).
 *
 * @returns CiInfo object if in a known CI environment, or null otherwise.
 */
export function getCiInfo(): CiInfo | null {
  // GitHub Actions
  if (process.env.GITHUB_ACTIONS) {
    const serverUrl = process.env.GITHUB_SERVER_URL || 'https://github.com';
    const repo = process.env.GITHUB_REPOSITORY;
    const runId = process.env.GITHUB_RUN_ID;

    // PR number: available via GITHUB_EVENT_NUMBER in pull_request events,
    // or from GITHUB_REF (refs/pull/<number>/merge)
    let prNumber: number | undefined;
    if (process.env.GITHUB_EVENT_NUMBER) {
      prNumber = parseInt(process.env.GITHUB_EVENT_NUMBER, 10) || undefined;
    } else if (process.env.GITHUB_REF?.startsWith('refs/pull/')) {
      const match = process.env.GITHUB_REF.match(/^refs\/pull\/(\d+)\//);
      if (match) {
        prNumber = parseInt(match[1], 10);
      }
    }

    return {
      provider: 'github_actions',
      prNumber,
      runUrl: repo && runId ? `${serverUrl}/${repo}/actions/runs/${runId}` : undefined,
      buildId: runId,
    };
  }

  // GitLab CI
  if (process.env.GITLAB_CI) {
    const prNumber = process.env.CI_MERGE_REQUEST_IID
      ? parseInt(process.env.CI_MERGE_REQUEST_IID, 10) || undefined
      : undefined;

    return {
      provider: 'gitlab_ci',
      prNumber,
      runUrl: process.env.CI_PIPELINE_URL || undefined,
      buildId: process.env.CI_PIPELINE_ID,
    };
  }

  // CircleCI
  if (process.env.CIRCLECI) {
    const prNumber = process.env.CIRCLE_PULL_REQUEST
      ? parseInt(process.env.CIRCLE_PULL_REQUEST.split('/').pop() || '', 10) || undefined
      : undefined;

    return {
      provider: 'circleci',
      prNumber,
      runUrl: process.env.CIRCLE_BUILD_URL || undefined,
      buildId: process.env.CIRCLE_WORKFLOW_ID,
    };
  }

  // Jenkins
  if (process.env.JENKINS_URL) {
    const prNumber = process.env.CHANGE_ID
      ? parseInt(process.env.CHANGE_ID, 10) || undefined
      : undefined;

    return {
      provider: 'jenkins',
      prNumber,
      runUrl: process.env.BUILD_URL || undefined,
      buildId: process.env.BUILD_ID,
    };
  }

  // Travis CI
  if (process.env.TRAVIS) {
    const prNumber = process.env.TRAVIS_PULL_REQUEST && process.env.TRAVIS_PULL_REQUEST !== 'false'
      ? parseInt(process.env.TRAVIS_PULL_REQUEST, 10) || undefined
      : undefined;

    return {
      provider: 'travis_ci',
      prNumber,
      runUrl: process.env.TRAVIS_BUILD_WEB_URL || undefined,
      buildId: process.env.TRAVIS_BUILD_ID,
    };
  }

  return null;
}
