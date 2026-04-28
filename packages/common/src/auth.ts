/**
 * Authentication utilities for TestivAI
 * Handles credential storage and retrieval
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { StoredCredentials } from './types';

const CREDENTIALS_DIR = path.join(os.homedir(), '.testivai');
const CREDENTIALS_FILE = path.join(CREDENTIALS_DIR, 'credentials');

/**
 * Ensure the credentials directory exists
 */
function ensureCredentialsDir(): void {
  if (!fs.existsSync(CREDENTIALS_DIR)) {
    fs.mkdirSync(CREDENTIALS_DIR, { recursive: true, mode: 0o700 });
  }
}

/**
 * Save credentials to the local file system
 */
export function saveCredentials(credentials: StoredCredentials): void {
  ensureCredentialsDir();
  fs.writeFileSync(CREDENTIALS_FILE, JSON.stringify(credentials, null, 2), {
    mode: 0o600,
  });
}

/**
 * Load credentials from the local file system
 * Returns null if no credentials are stored
 */
export function loadCredentials(): StoredCredentials | null {
  if (!fs.existsSync(CREDENTIALS_FILE)) {
    return null;
  }
  try {
    const content = fs.readFileSync(CREDENTIALS_FILE, 'utf-8');
    return JSON.parse(content) as StoredCredentials;
  } catch {
    return null;
  }
}

/**
 * Delete stored credentials
 */
export function deleteCredentials(): void {
  if (fs.existsSync(CREDENTIALS_FILE)) {
    fs.unlinkSync(CREDENTIALS_FILE);
  }
}

/**
 * Get the API key from environment variable or stored credentials
 * Environment variable takes precedence
 */
export function getApiKey(): string | null {
  // Check environment variable first
  const envKey = process.env.TESTIVAI_API_KEY;
  if (envKey) {
    return envKey;
  }

  // Fall back to stored credentials
  const credentials = loadCredentials();
  return credentials?.apiKey || null;
}

/**
 * Check if the user is authenticated
 */
export function isAuthenticated(): boolean {
  return getApiKey() !== null;
}
