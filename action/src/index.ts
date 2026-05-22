/**
 * Main entry point for TestivAI GitHub Action
 */

import * as core from '@actions/core';
import * as github from '@actions/github';
import * as artifact from '@actions/artifact';
import * as fs from 'fs';
import * as path from 'path';
import { buildComment, buildEmptyComment } from './comment';
import { determineStatus, STATUS_CONTEXT } from './status';
import { ResultsData } from './types';

/**
 * Recursively collect all file paths under a directory.
 * Used so the artifact upload includes visual-report/images/ subdirectories.
 */
function collectFilesRecursively(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const fullPath = path.join(dir, entry.name);
    return entry.isDirectory() ? collectFilesRecursively(fullPath) : [fullPath];
  });
}

async function run(): Promise<void> {
  try {
    // Read inputs
    const token = core.getInput('github-token', { required: true });
    const reportDir = core.getInput('report-dir', { required: true });
    const failOnDiff = core.getBooleanInput('fail-on-diff');
    const uploadArtifact = core.getBooleanInput('upload-artifact');
    const artifactRetentionDays = parseInt(core.getInput('artifact-retention-days'), 10);
    const artifactName = core.getInput('artifact-name') || 'testivai-visual-report';

    core.info(`Reading results from ${reportDir}...`);

    // Read results.json
    const resultsPath = path.join(reportDir, 'results.json');
    if (!fs.existsSync(resultsPath)) {
      core.setFailed(`results.json not found at ${resultsPath}. Did the tests run?`);
      return;
    }

    const results: ResultsData = JSON.parse(fs.readFileSync(resultsPath, 'utf-8'));

    // Bundle pending baselines into the report dir so the approve action can
    // access them when a developer posts /testivai approve on the PR.
    // .testivai/temp/<name>/ is generated during the test run and is not
    // committed to the repo; copying it here makes it available in the artifact.
    const tempDir = path.join(process.cwd(), '.testivai', 'temp');
    if (fs.existsSync(tempDir)) {
      const pendingDir = path.join(reportDir, 'pending-baselines');
      fs.mkdirSync(pendingDir, { recursive: true });
      let copied = 0;
      for (const name of fs.readdirSync(tempDir)) {
        const src = path.join(tempDir, name);
        const dst = path.join(pendingDir, name);
        if (fs.statSync(src).isDirectory()) {
          fs.cpSync(src, dst, { recursive: true });
          copied++;
        }
      }
      if (copied > 0) core.info(`Bundled ${copied} pending baseline(s) for approval`);
    }

    // Upload artifact if enabled (recursive so images/ and pending-baselines/ are included)
    let artifactUrl: string | undefined;
    if (uploadArtifact) {
      const artifactClient = new artifact.DefaultArtifactClient();
      const files = collectFilesRecursively(reportDir);

      const uploadResult = await artifactClient.uploadArtifact(
        artifactName,
        files,
        reportDir,
        { retentionDays: artifactRetentionDays },
      );

      core.info(`Uploaded ${files.length} files as artifact '${artifactName}'`);

      // Build a direct ZIP download link for the artifact
      const runId = process.env.GITHUB_RUN_ID;
      const context = github.context;
      if (runId && uploadResult.id) {
        // Direct link triggers artifact ZIP download
        artifactUrl = `https://github.com/${context.repo.owner}/${context.repo.repo}/actions/runs/${runId}/artifacts/${uploadResult.id}`;
        core.info(`Report link: ${artifactUrl}`);
      } else if (runId) {
        // Fallback: link to the workflow run page (artifact ID unavailable)
        artifactUrl = `https://github.com/${context.repo.owner}/${context.repo.repo}/actions/runs/${runId}`;
        core.info(`Report link (fallback): ${artifactUrl}`);
      }

      // Expose artifact ID as an output for downstream steps
      if (uploadResult.id) {
        core.setOutput('artifact-id', String(uploadResult.id));
      }
    }

    // Get GitHub context
    const octokit = github.getOctokit(token);
    const context = github.context;

    // Only post comment on PRs
    if (context.eventName === 'pull_request' && context.payload.pull_request) {
      const prNumber = context.payload.pull_request.number;

      const { data: comments } = await octokit.rest.issues.listComments({
        owner: context.repo.owner,
        repo: context.repo.repo,
        issue_number: prNumber,
      });

      // Build comment — includes artifact link when available
      const commentBody = results.snapshots.length === 0
        ? buildEmptyComment(artifactUrl)
        : buildComment(results, artifactUrl);

      // Look for existing comment to upsert
      const existingComment = comments.find(c =>
        c.body?.includes('<!-- testivai-visual-report -->')
      );

      if (existingComment) {
        await octokit.rest.issues.updateComment({
          owner: context.repo.owner,
          repo: context.repo.repo,
          comment_id: existingComment.id,
          body: commentBody,
        });
        core.info('Updated existing PR comment');
      } else {
        await octokit.rest.issues.createComment({
          owner: context.repo.owner,
          repo: context.repo.repo,
          issue_number: prNumber,
          body: commentBody,
        });
        core.info('Created new PR comment');
      }
    } else {
      core.info('Not a PR event, skipping comment');
    }

    // Post commit status
    const status = determineStatus(results, { failOnDiff });
    const sha = context.payload.pull_request?.head.sha || context.sha;

    await octokit.rest.repos.createCommitStatus({
      owner: context.repo.owner,
      repo: context.repo.repo,
      sha,
      state: status.state,
      context: STATUS_CONTEXT,
      description: status.description,
    });

    core.info(`Set commit status: ${status.state} - ${status.description}`);

    // Fail workflow if needed
    if (status.state === 'failure') {
      core.setFailed(`Visual regression detected: ${status.description}`);
    } else if (results.summary.changed > 0 || results.summary.newSnapshots > 0) {
      core.warning(`Visual changes found: ${results.summary.changed} changed, ${results.summary.newSnapshots} new`);
    } else {
      core.info('All visual snapshots passed!');
    }

  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(error.message);
    } else {
      core.setFailed('Unknown error occurred');
    }
  }
}

run();
