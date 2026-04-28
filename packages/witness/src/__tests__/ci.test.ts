import { getCiRunId, getCiInfo } from '../ci';

describe('CI Environment Detection', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset env to a clean slate before each test
    process.env = { ...originalEnv };
    // Remove all CI-related env vars
    delete process.env.GITHUB_RUN_ID;
    delete process.env.GITHUB_ACTIONS;
    delete process.env.GITHUB_SERVER_URL;
    delete process.env.GITHUB_REPOSITORY;
    delete process.env.GITHUB_EVENT_NUMBER;
    delete process.env.GITHUB_REF;
    delete process.env.GITLAB_CI;
    delete process.env.CI_PIPELINE_ID;
    delete process.env.CI_MERGE_REQUEST_IID;
    delete process.env.CI_PIPELINE_URL;
    delete process.env.CIRCLECI;
    delete process.env.CIRCLE_WORKFLOW_ID;
    delete process.env.CIRCLE_PULL_REQUEST;
    delete process.env.CIRCLE_BUILD_URL;
    delete process.env.JENKINS_URL;
    delete process.env.BUILD_ID;
    delete process.env.BUILD_URL;
    delete process.env.CHANGE_ID;
    delete process.env.TRAVIS;
    delete process.env.TRAVIS_BUILD_ID;
    delete process.env.TRAVIS_PULL_REQUEST;
    delete process.env.TRAVIS_BUILD_WEB_URL;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('getCiRunId', () => {
    it('should return null when not in CI', () => {
      expect(getCiRunId()).toBeNull();
    });

    it('should detect GitHub Actions', () => {
      process.env.GITHUB_RUN_ID = '123456';
      expect(getCiRunId()).toBe('github-123456');
    });

    it('should detect GitLab CI', () => {
      process.env.GITLAB_CI = 'true';
      process.env.CI_PIPELINE_ID = '789';
      expect(getCiRunId()).toBe('gitlab-789');
    });

    it('should detect Jenkins', () => {
      process.env.JENKINS_URL = 'https://jenkins.example.com';
      process.env.BUILD_ID = '42';
      expect(getCiRunId()).toBe('jenkins-42');
    });

    it('should detect CircleCI', () => {
      process.env.CIRCLECI = 'true';
      process.env.CIRCLE_WORKFLOW_ID = 'wf-abc';
      expect(getCiRunId()).toBe('circleci-wf-abc');
    });

    it('should detect Travis CI', () => {
      process.env.TRAVIS = 'true';
      process.env.TRAVIS_BUILD_ID = '999';
      expect(getCiRunId()).toBe('travis-999');
    });

    it('should prioritize GitHub Actions over other providers', () => {
      process.env.GITHUB_RUN_ID = '111';
      process.env.GITLAB_CI = 'true';
      process.env.CI_PIPELINE_ID = '222';
      expect(getCiRunId()).toBe('github-111');
    });
  });

  describe('getCiInfo', () => {
    it('should return null when not in CI', () => {
      expect(getCiInfo()).toBeNull();
    });

    describe('GitHub Actions', () => {
      beforeEach(() => {
        process.env.GITHUB_ACTIONS = 'true';
        process.env.GITHUB_RUN_ID = '12345';
        process.env.GITHUB_REPOSITORY = 'owner/repo';
        process.env.GITHUB_SERVER_URL = 'https://github.com';
      });

      it('should return basic GitHub Actions info', () => {
        const info = getCiInfo();
        expect(info).toEqual({
          provider: 'github_actions',
          prNumber: undefined,
          runUrl: 'https://github.com/owner/repo/actions/runs/12345',
          buildId: '12345',
        });
      });

      it('should detect PR number from GITHUB_EVENT_NUMBER', () => {
        process.env.GITHUB_EVENT_NUMBER = '42';
        const info = getCiInfo();
        expect(info?.prNumber).toBe(42);
      });

      it('should detect PR number from GITHUB_REF', () => {
        process.env.GITHUB_REF = 'refs/pull/99/merge';
        const info = getCiInfo();
        expect(info?.prNumber).toBe(99);
      });

      it('should not set PR number for non-PR refs', () => {
        process.env.GITHUB_REF = 'refs/heads/main';
        const info = getCiInfo();
        expect(info?.prNumber).toBeUndefined();
      });

      it('should use default server URL', () => {
        delete process.env.GITHUB_SERVER_URL;
        const info = getCiInfo();
        expect(info?.runUrl).toBe('https://github.com/owner/repo/actions/runs/12345');
      });

      it('should handle missing repository', () => {
        delete process.env.GITHUB_REPOSITORY;
        const info = getCiInfo();
        expect(info?.runUrl).toBeUndefined();
      });
    });

    describe('GitLab CI', () => {
      beforeEach(() => {
        process.env.GITLAB_CI = 'true';
        process.env.CI_PIPELINE_ID = '456';
        process.env.CI_PIPELINE_URL = 'https://gitlab.com/project/-/pipelines/456';
      });

      it('should return basic GitLab CI info', () => {
        const info = getCiInfo();
        expect(info).toEqual({
          provider: 'gitlab_ci',
          prNumber: undefined,
          runUrl: 'https://gitlab.com/project/-/pipelines/456',
          buildId: '456',
        });
      });

      it('should detect MR number', () => {
        process.env.CI_MERGE_REQUEST_IID = '7';
        const info = getCiInfo();
        expect(info?.prNumber).toBe(7);
      });
    });

    describe('CircleCI', () => {
      beforeEach(() => {
        process.env.CIRCLECI = 'true';
        process.env.CIRCLE_WORKFLOW_ID = 'wf-xyz';
        process.env.CIRCLE_BUILD_URL = 'https://circleci.com/gh/owner/repo/123';
      });

      it('should return basic CircleCI info', () => {
        const info = getCiInfo();
        expect(info).toEqual({
          provider: 'circleci',
          prNumber: undefined,
          runUrl: 'https://circleci.com/gh/owner/repo/123',
          buildId: 'wf-xyz',
        });
      });

      it('should detect PR number from pull request URL', () => {
        process.env.CIRCLE_PULL_REQUEST = 'https://github.com/owner/repo/pull/55';
        const info = getCiInfo();
        expect(info?.prNumber).toBe(55);
      });
    });

    describe('Jenkins', () => {
      beforeEach(() => {
        process.env.JENKINS_URL = 'https://jenkins.example.com';
        process.env.BUILD_ID = '100';
        process.env.BUILD_URL = 'https://jenkins.example.com/job/my-job/100/';
      });

      it('should return basic Jenkins info', () => {
        const info = getCiInfo();
        expect(info).toEqual({
          provider: 'jenkins',
          prNumber: undefined,
          runUrl: 'https://jenkins.example.com/job/my-job/100/',
          buildId: '100',
        });
      });

      it('should detect PR number from CHANGE_ID', () => {
        process.env.CHANGE_ID = '33';
        const info = getCiInfo();
        expect(info?.prNumber).toBe(33);
      });
    });

    describe('Travis CI', () => {
      beforeEach(() => {
        process.env.TRAVIS = 'true';
        process.env.TRAVIS_BUILD_ID = '888';
        process.env.TRAVIS_BUILD_WEB_URL = 'https://app.travis-ci.com/owner/repo/builds/888';
      });

      it('should return basic Travis CI info', () => {
        const info = getCiInfo();
        expect(info).toEqual({
          provider: 'travis_ci',
          prNumber: undefined,
          runUrl: 'https://app.travis-ci.com/owner/repo/builds/888',
          buildId: '888',
        });
      });

      it('should detect PR number', () => {
        process.env.TRAVIS_PULL_REQUEST = '17';
        const info = getCiInfo();
        expect(info?.prNumber).toBe(17);
      });

      it('should not set PR number when TRAVIS_PULL_REQUEST is false', () => {
        process.env.TRAVIS_PULL_REQUEST = 'false';
        const info = getCiInfo();
        expect(info?.prNumber).toBeUndefined();
      });
    });

    describe('Payload shape matches Core API CiInfo schema', () => {
      it('should produce fields matching Core API aliases: provider, prNumber, runUrl, buildId', () => {
        process.env.GITHUB_ACTIONS = 'true';
        process.env.GITHUB_RUN_ID = '1';
        process.env.GITHUB_REPOSITORY = 'o/r';
        process.env.GITHUB_EVENT_NUMBER = '10';

        const info = getCiInfo();
        expect(info).toBeDefined();
        // These are the exact camelCase keys the Core API CiInfo Pydantic model expects via aliases
        expect(info).toHaveProperty('provider');
        expect(info).toHaveProperty('prNumber');
        expect(info).toHaveProperty('runUrl');
        expect(info).toHaveProperty('buildId');
        // Ensure no unexpected snake_case keys
        expect(info).not.toHaveProperty('pr_number');
        expect(info).not.toHaveProperty('run_url');
        expect(info).not.toHaveProperty('build_id');
      });
    });
  });
});
