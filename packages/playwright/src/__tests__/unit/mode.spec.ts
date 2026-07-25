import * as fs from 'fs-extra';
import * as os from 'os';
import * as path from 'path';
import { resolveLocalMode } from '../../mode';

describe('resolveLocalMode', () => {
  const originalEnv = process.env;
  let tmpRoot: string;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.TESTIVAI_MODE;
    delete process.env.TESTIVAI_API_KEY;
    tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'testivai-mode-'));
  });

  afterEach(() => {
    fs.removeSync(tmpRoot);
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  const writeConfig = (mode?: string) => {
    fs.ensureDirSync(path.join(tmpRoot, '.testivai'));
    fs.writeJsonSync(path.join(tmpRoot, '.testivai', 'config.json'), mode ? { mode } : {});
  };

  it('defaults to local when no key, no config, no env (zero-config)', () => {
    expect(resolveLocalMode({ projectRoot: tmpRoot })).toBe(true);
  });

  it('is cloud when a TESTIVAI_API_KEY is present', () => {
    process.env.TESTIVAI_API_KEY = 'abc123';
    expect(resolveLocalMode({ projectRoot: tmpRoot })).toBe(false);
  });

  it('honors an explicit apiKey option over env', () => {
    expect(resolveLocalMode({ projectRoot: tmpRoot, apiKey: 'k' })).toBe(false);
  });

  it('TESTIVAI_MODE=local wins even when a key is present', () => {
    process.env.TESTIVAI_API_KEY = 'abc123';
    process.env.TESTIVAI_MODE = 'local';
    expect(resolveLocalMode({ projectRoot: tmpRoot })).toBe(true);
  });

  it('TESTIVAI_MODE=cloud wins even with no key', () => {
    process.env.TESTIVAI_MODE = 'cloud';
    expect(resolveLocalMode({ projectRoot: tmpRoot })).toBe(false);
  });

  it('config mode:local forces local even when a key is present', () => {
    process.env.TESTIVAI_API_KEY = 'abc123';
    writeConfig('local');
    expect(resolveLocalMode({ projectRoot: tmpRoot })).toBe(true);
  });

  it('config mode:cloud forces cloud even with no key', () => {
    writeConfig('cloud');
    expect(resolveLocalMode({ projectRoot: tmpRoot })).toBe(false);
  });

  it('env overrides config', () => {
    writeConfig('cloud');
    process.env.TESTIVAI_MODE = 'local';
    expect(resolveLocalMode({ projectRoot: tmpRoot })).toBe(true);
  });

  it('ignores a malformed config file and falls back to key presence', () => {
    fs.ensureDirSync(path.join(tmpRoot, '.testivai'));
    fs.writeFileSync(path.join(tmpRoot, '.testivai', 'config.json'), '{ not json');
    expect(resolveLocalMode({ projectRoot: tmpRoot })).toBe(true); // no key ⇒ local
  });
});
