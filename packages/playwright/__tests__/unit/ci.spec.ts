import { getCiRunId } from '../../src/ci';

describe('getCiRunId', () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    jest.resetModules(); // Clears the module cache
    // Start with a clean environment, preserving only essential vars like PATH
    process.env = { PATH: OLD_ENV.PATH }; 
  });

  afterEach(() => {
    process.env = OLD_ENV; // Restore original environment
  });

  test('should return GitHub run ID when in GitHub Actions', () => {
    process.env.GITHUB_RUN_ID = 'github123';
    expect(getCiRunId()).toBe('github-github123');
  });

  test('should return GitLab pipeline ID when in GitLab CI', () => {
    process.env.GITLAB_CI = 'true';
    process.env.CI_PIPELINE_ID = 'gitlab456';
    expect(getCiRunId()).toBe('gitlab-gitlab456');
  });

  test('should return Jenkins build ID when in Jenkins', () => {
    process.env.JENKINS_URL = 'http://jenkins.example.com';
    process.env.BUILD_ID = 'jenkins789';
    expect(getCiRunId()).toBe('jenkins-jenkins789');
  });

  test('should return null when not in a known CI environment', () => {
    // Ensure no CI variables are set
    delete process.env.GITHUB_RUN_ID;
    delete process.env.GITLAB_CI;
    delete process.env.JENKINS_URL;
    expect(getCiRunId()).toBeNull();
  });
});
