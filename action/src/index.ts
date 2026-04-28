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

async function run(): Promise<void> {
  try {
    // Read inputs
    const token = core.getInput('github-token', { required: true });
    const reportDir = core.getInput('report-dir', { required: true });
    const failOnDiff = core.getBooleanInput('fail-on-diff');
    const uploadArtifact = core.getBooleanInput('upload-artifact');
    const artifactRetentionDays = parseInt(core.getInput('artifact-retention-days'), 10);

    core.info(`Reading results from ${reportDir}...`);

    // Read results.json
    const resultsPath = path.join(reportDir, 'results.json');
    if (!fs.existsSync(resultsPath)) {
      core.setFailed(`results.json not found at ${resultsPath}. Did the tests run?`);
      return;
    }

    const results: ResultsData = JSON.parse(fs.readFileSync(resultsPath, 'utf-8'));

    // Upload artifact if enabled
    if (uploadArtifact) {
      const artifactClient = new artifact.DefaultArtifactClient();
      const artifactName = 'testivai-visual-report';

      const files = fs.readdirSync(reportDir).map(f => path.join(reportDir, f));

      await artifactClient.uploadArtifact(
        artifactName,
        files,
        reportDir,
        { retentionDays: artifactRetentionDays }
      );

      core.info(`Uploaded ${files.length} files as artifact '${artifactName}'`);
    }

    // Get GitHub context
    const octokit = github.getOctokit(token);
    const context = github.context;

    // Only post comment on PRs
    if (context.eventName === 'pull_request' && context.payload.pull_request) {
      const { data: comments } = await octokit.rest.issues.listComments({
        owner: context.repo.owner,
        repo: context.repo.repo,
        issue_number: context.payload.pull_request.number,
      });

      // Build comment
      const commentBody = results.snapshots.length === 0
        ? buildEmptyComment()
        : buildComment(results);

      // Look for existing comment to upsert
      const existingComment = comments.find(c =>
        c.body?.includes('<!-- testivai-visual-report -->')
      );

      if (existingComment) {
        // Update existing comment
        await octokit.rest.issues.updateComment({
          owner: context.repo.owner,
          repo: context.repo.repo,
          comment_id: existingComment.id,
          body: commentBody,
        });
        core.info('Updated existing PR comment');
      } else {
        // Create new comment
        await octokit.rest.issues.createComment({
          owner: context.repo.owner,
          repo: context.repo.repo,
          issue_number: context.payload.pull_request.number,
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
