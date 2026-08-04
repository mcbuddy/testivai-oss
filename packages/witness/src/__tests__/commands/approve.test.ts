/**
 * Tests for the TestivAI approve command
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { BaselineStore } from '../../baselines/store';

describe('Approve Command (BaselineStore operations)', () => {
  let tmpDir: string;
  let store: BaselineStore;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'testivai-approve-'));
    store = new BaselineStore(tmpDir);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  const FAKE_PNG_A = Buffer.from('approve-test-baseline');
  const FAKE_PNG_B = Buffer.from('approve-test-updated');
  const _FAKE_PNG_C = Buffer.from('approve-test-third');

  describe('T4.1 - approve specific name', () => {
    it('should copy temp to baseline', () => {
      store.writeTemp('homepage', FAKE_PNG_B);
      store.approve('homepage');

      expect(store.exists('homepage')).toBe(true);
      expect(store.read('homepage')).toEqual(FAKE_PNG_B);
    });
  });

  describe('T4.2 - approve --all', () => {
    it('should approve all temp snapshots', () => {
      store.writeTemp('homepage', FAKE_PNG_A);
      store.writeTemp('dashboard', FAKE_PNG_B);
      store.writeTemp('settings', FAKE_PNG_A);

      const tempNames = store.listTemp();
      for (const name of tempNames) {
        store.approve(name);
      }

      expect(store.exists('homepage')).toBe(true);
      expect(store.exists('dashboard')).toBe(true);
      expect(store.exists('settings')).toBe(true);
      expect(store.read('homepage')).toEqual(FAKE_PNG_A);
      expect(store.read('dashboard')).toEqual(FAKE_PNG_B);
    });
  });

  describe('T4.3 - approve --undo', () => {
    it('should restore previous baseline from .previous/', () => {
      // Create baseline, then approve new one
      store.write('homepage', FAKE_PNG_A);
      store.writeTemp('homepage', FAKE_PNG_B);
      store.approve('homepage');

      expect(store.read('homepage')).toEqual(FAKE_PNG_B);

      // Undo
      store.undo('homepage');
      expect(store.read('homepage')).toEqual(FAKE_PNG_A);
    });
  });

  describe('T4.4 - approve nonexistent name', () => {
    it('should throw descriptive error', () => {
      expect(() => {
        store.approve('nonexistent');
      }).toThrow(/No temp screenshot found.*nonexistent/);
    });
  });

  describe('findLatestUndoable', () => {
    it('returns null when no baselines have .previous/', () => {
      expect(store.findLatestUndoable()).toBeNull();

      store.write('homepage', FAKE_PNG_A);
      expect(store.findLatestUndoable()).toBeNull();
    });

    it('returns the name with the newest .previous/screenshot.png mtime', () => {
      // Create two baselines with .previous/ backups
      store.write('homepage', FAKE_PNG_A);
      store.writeTemp('homepage', FAKE_PNG_B);
      store.approve('homepage');

      // Small delay so mtime differs
      const later = new Date(Date.now() + 2000);

      store.write('dashboard', FAKE_PNG_A);
      store.writeTemp('dashboard', FAKE_PNG_B);
      store.approve('dashboard');

      // Touch the homepage .previous/ screenshot to make it newer
      const homePrev = path.join(
        store.getBaselineDir('homepage'),
        '.previous',
        'screenshot.png'
      );
      fs.utimesSync(homePrev, later, later);

      expect(store.findLatestUndoable()).toBe('homepage');
    });

    it('skips directories that are not baselines', () => {
      // Create a stray file in baselines dir
      fs.mkdirSync(path.join(tmpDir, '.testivai', 'baselines'), { recursive: true });
      fs.writeFileSync(
        path.join(tmpDir, '.testivai', 'baselines', 'not-a-dir'),
        'garbage'
      );
      expect(store.findLatestUndoable()).toBeNull();
    });
  });
});
