/**
 * resolveBaselinesDir — config-honored, {platform}-tokenized baseline paths.
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { BaselineStore, resolveBaselinesDir } from '../baselines/store';

describe('resolveBaselinesDir', () => {
  let root: string;

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'testivai-bdir-'));
  });

  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });

  const writeConfig = (obj: unknown) => {
    fs.mkdirSync(path.join(root, '.testivai'), { recursive: true });
    fs.writeFileSync(path.join(root, '.testivai', 'config.json'), JSON.stringify(obj));
  };

  it('defaults to .testivai/baselines', () => {
    expect(resolveBaselinesDir(root)).toBe(path.join(root, '.testivai', 'baselines'));
  });

  it('honors config baselinesDir (previously a dead field)', () => {
    writeConfig({ baselinesDir: 'golden' });
    expect(resolveBaselinesDir(root)).toBe(path.join(root, 'golden'));
  });

  it('replaces the {platform} token', () => {
    writeConfig({ baselinesDir: '.testivai/baselines-{platform}' });
    expect(resolveBaselinesDir(root)).toBe(path.join(root, '.testivai', `baselines-${process.platform}`));
  });

  it('explicit override wins over config', () => {
    writeConfig({ baselinesDir: 'golden' });
    expect(resolveBaselinesDir(root, 'other')).toBe(path.join(root, 'other'));
  });

  it('BaselineStore reads and writes through the configured dir', () => {
    writeConfig({ baselinesDir: 'golden-{platform}' });
    const store = new BaselineStore(root);
    store.write('home', Buffer.from('png'));
    expect(fs.existsSync(path.join(root, `golden-${process.platform}`, 'home', 'screenshot.png'))).toBe(true);
    expect(store.list()).toEqual(['home']);
  });
});
