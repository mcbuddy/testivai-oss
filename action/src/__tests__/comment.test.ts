/**
 * Tests for comment builder
 */

import { buildComment, buildEmptyComment } from '../comment';
import { ResultsData } from '../types';

describe('buildComment', () => {
  it('T6.1 - includes TestivAI Visual Report header', () => {
    const results: ResultsData = {
      timestamp: Date.now(),
      summary: { total: 1, passed: 1, changed: 0, newSnapshots: 0 },
      snapshots: [{ id: '1', name: 'homepage', status: 'passed', currentPath: 'test.png' }],
    };

    const comment = buildComment(results);
    expect(comment).toContain('### 🔍 TestivAI Visual Report');
  });

  it('T6.2 - includes upsert marker', () => {
    const results: ResultsData = {
      timestamp: Date.now(),
      summary: { total: 0, passed: 0, changed: 0, newSnapshots: 0 },
      snapshots: [],
    };

    const comment = buildComment(results);
    expect(comment).toContain('<!-- testivai-visual-report -->');
  });

  it('T6.3 - includes summary line with counts', () => {
    const results: ResultsData = {
      timestamp: Date.now(),
      summary: { total: 5, passed: 2, changed: 2, newSnapshots: 1 },
      snapshots: [],
    };

    const comment = buildComment(results);
    expect(comment).toContain('✅ **2 passed**');
    expect(comment).toContain('⚠️ **2 changed**');
    expect(comment).toContain('🆕 **1 new**');
  });

  it('T6.4 - includes details with approve command for changed snapshots', () => {
    const results: ResultsData = {
      timestamp: Date.now(),
      summary: { total: 1, passed: 0, changed: 1, newSnapshots: 0 },
      snapshots: [
        { id: '1', name: 'homepage', status: 'changed', diffPercentage: 12.5, currentPath: 'test.png' },
      ],
    };

    const comment = buildComment(results);
    expect(comment).toContain('homepage');
    expect(comment).toContain('12.50% different');
    expect(comment).toContain('npx testivai approve "homepage"');
    expect(comment).toContain('npx testivai approve --all');
  });

  it('T6.5 - no details sections when all passed', () => {
    const results: ResultsData = {
      timestamp: Date.now(),
      summary: { total: 3, passed: 3, changed: 0, newSnapshots: 0 },
      snapshots: [
        { id: '1', name: 'page1', status: 'passed', currentPath: 'test.png' },
        { id: '2', name: 'page2', status: 'passed', currentPath: 'test.png' },
        { id: '3', name: 'page3', status: 'passed', currentPath: 'test.png' },
      ],
    };

    const comment = buildComment(results);
    expect(comment).not.toContain('Changed Snapshots');
    expect(comment).not.toContain('New Snapshots');
  });

  it('T6.6 - empty results has graceful message', () => {
    const comment = buildEmptyComment();
    expect(comment).toContain('No visual snapshots were captured');
  });
});
