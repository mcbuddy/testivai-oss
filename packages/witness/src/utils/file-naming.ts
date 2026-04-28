/**
 * File naming utilities for TestivAI Witness SDK
 * Converts snapshot names to safe filenames
 */

/**
 * Convert a snapshot name to a safe filename
 * - Replace spaces with hyphens
 * - Remove or replace special characters
 * - Limit length
 * - Ensure it's not empty
 */
export function toSafeFilename(name: string): string {
  if (!name || typeof name !== 'string') {
    return 'snapshot';
  }

  // Remove leading/trailing whitespace
  let filename = name.trim();

  // If empty after trimming, use default
  if (!filename) {
    return 'snapshot';
  }

  // Replace spaces and common separators with hyphens
  filename = filename.replace(/[\s_\/\\]+/g, '-');

  // Remove invalid filename characters (Windows-safe)
  // Keep: letters, numbers, hyphens, dots, underscores, parentheses
  filename = filename.replace(/[<>:"|?*]/g, '');

  // Replace multiple consecutive hyphens with single hyphen
  filename = filename.replace(/-+/g, '-');

  // Remove leading/trailing hyphens and dots
  filename = filename.replace(/^[-\.]+|[-\.]+$/g, '');

  // Limit length (255 is max for most filesystems, leave room for extension)
  if (filename.length > 200) {
    filename = filename.substring(0, 200);
    // Remove trailing hyphen if we cut in the middle
    filename = filename.replace(/-$/, '');
  }

  // If still empty after cleaning, use default
  if (!filename) {
    return 'snapshot';
  }

  // Convert to lowercase for consistency
  return filename.toLowerCase();
}

/**
 * Generate a unique filename with timestamp
 */
export function generateUniqueFilename(name: string, extension: string = ''): string {
  const safeName = toSafeFilename(name);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const uniqueName = `${safeName}-${timestamp}`;
  
  return extension ? `${uniqueName}.${extension.replace(/^\./, '')}` : uniqueName;
}

/**
 * Extract snapshot name from a URL
 * Useful for auto-generating names from page URLs
 */
export function extractNameFromUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    
    // Remove leading/trailing slashes
    const cleanPath = pathname.replace(/^\/|\/$/g, '');
    
    // If path is empty or just '/', use hostname
    if (!cleanPath) {
      return urlObj.hostname.replace(/\./g, '-');
    }
    
    // Convert path segments to name
    const segments = cleanPath.split('/');
    const lastSegment = segments[segments.length - 1];
    
    // If last segment looks like an ID, use the parent
    if (/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(lastSegment) ||
        /^\d+$/.test(lastSegment)) {
      return segments[segments.length - 2] || 'page';
    }
    
    return lastSegment || 'page';
  } catch {
    // If URL parsing fails, extract from string
    const matches = url.match(/\/([^\/]+)\/?$/);
    return matches ? matches[1] : 'page';
  }
}

/**
 * Sanitize a name for use in test names
 * Less restrictive than filename sanitization
 */
export function sanitizeTestName(name: string): string {
  if (!name || typeof name !== 'string') {
    return 'test';
  }

  // Remove leading/trailing whitespace
  let testName = name.trim();

  // Replace multiple spaces with single space
  testName = testName.replace(/\s+/g, ' ');

  // Remove control characters
  testName = testName.replace(/[\x00-\x1F\x7F]/g, '');

  // Limit length
  if (testName.length > 100) {
    testName = testName.substring(0, 100);
  }

  return testName || 'test';
}

/**
 * Check if a filename is safe
 */
export function isSafeFilename(filename: string): boolean {
  if (!filename || typeof filename !== 'string') {
    return false;
  }

  // Check for invalid characters
  if (/[<>:"|?*]/.test(filename)) {
    return false;
  }

  // Check reserved names (Windows)
  const reservedNames = [
    'CON', 'PRN', 'AUX', 'NUL',
    'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9',
    'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'
  ];

  const nameWithoutExt = filename.split('.')[0].toUpperCase();
  if (reservedNames.includes(nameWithoutExt)) {
    return false;
  }

  // Check length
  if (filename.length > 255) {
    return false;
  }

  return true;
}
