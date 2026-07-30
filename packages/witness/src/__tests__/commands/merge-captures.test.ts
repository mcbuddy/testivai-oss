/**
 * merge-captures — unioning sharded captures.
 *
 * These mirror the shapes a real sharded CI run produces, including the two
 * directory layouts (`download-artifact` parents vs. a temp dir copied
 * directly) and the shard that legitimately ran no tests.
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { mergeCaptures } from '../../commands/merge-captures';

function makeCapture(dir: string, name: string, bytes = 'png'): void {
  const d = path.join(dir, name);
  fs.mkdirSync(d, { recursive: true });
  fs.writeFileSync(path.join(d, 'screenshot.png'), bytes);
  fs.writeFileSync(path.join(d, 'dom.html'), `<html><!-- ${name} --></html>`);
  fs.writeFileSync(path.join(d, 'elements.json'), '[]');
}

describe('mergeCaptures', () => {
  let root: string;
  let dest: string;

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'merge-captures-'));
    dest = path.join(root, 'project', '.testivai', 'temp');
  });

  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });

  it('unions captures from download-artifact style parents', () => {
    // collected/temp-shard-N/<snapshot>/screenshot.png
    const collected = path.join(root, 'collected');
    makeCapture(path.join(collected, 'temp-shard-1'), 'home');
    makeCapture(path.join(collected, 'temp-shard-2'), 'buttons');
    makeCapture(path.join(collected, 'temp-shard-3'), 'products');

    const result = mergeCaptures([collected], dest);

    expect(result.merged).toEqual(['buttons', 'home', 'products']);
    expect(result.conflicts).toEqual([]);
    for (const name of result.merged) {
      expect(fs.existsSync(path.join(dest, name, 'screenshot.png'))).toBe(true);
      expect(fs.existsSync(path.join(dest, name, 'dom.html'))).toBe(true);
      expect(fs.existsSync(path.join(dest, name, 'elements.json'))).toBe(true);
    }
  });

  it('accepts temp directories passed directly', () => {
    const a = path.join(root, 'tempA');
    const b = path.join(root, 'tempB');
    makeCapture(a, 'home');
    makeCapture(b, 'checkout');

    const result = mergeCaptures([a, b], dest);

    expect(result.merged).toEqual(['checkout', 'home']);
  });

  it('reports a shard that captured nothing without failing', () => {
    const collected = path.join(root, 'collected');
    makeCapture(path.join(collected, 'temp-shard-1'), 'home');
    // shard 2 ran no tests: artifact directory exists but holds no captures
    fs.mkdirSync(path.join(collected, 'temp-shard-2'), { recursive: true });
    const missing = path.join(root, 'never-uploaded');

    const result = mergeCaptures([collected, missing], dest);

    expect(result.merged).toEqual(['home']);
    expect(result.empty).toContain(missing);
  });

  it('flags the same snapshot arriving from two shards', () => {
    const collected = path.join(root, 'collected');
    makeCapture(path.join(collected, 'temp-shard-1'), 'home', 'first');
    makeCapture(path.join(collected, 'temp-shard-2'), 'home', 'second');

    const result = mergeCaptures([collected], dest);

    expect(result.merged).toEqual(['home']);
    expect(result.conflicts).toEqual(['home']);
    // last write wins, deterministically
    expect(fs.readFileSync(path.join(dest, 'home', 'screenshot.png'), 'utf-8')).toBe('second');
  });

  it('creates the destination when the project has no temp dir yet', () => {
    const collected = path.join(root, 'collected');
    makeCapture(path.join(collected, 'temp-shard-1'), 'home');

    expect(fs.existsSync(dest)).toBe(false);
    mergeCaptures([collected], dest);
    expect(fs.existsSync(path.join(dest, 'home'))).toBe(true);
  });

  it('ignores directories that are not captures', () => {
    const collected = path.join(root, 'collected');
    makeCapture(path.join(collected, 'temp-shard-1'), 'home');
    // a stray directory with no screenshot.png must not be treated as a capture
    fs.mkdirSync(path.join(collected, 'temp-shard-1', 'not-a-capture'), { recursive: true });
    fs.writeFileSync(path.join(collected, 'temp-shard-1', 'not-a-capture', 'notes.txt'), 'x');

    const result = mergeCaptures([collected], dest);

    expect(result.merged).toEqual(['home']);
  });
});
