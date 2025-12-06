/**
 * Cloudflare R2 Storage Utility
 * Uses Cloudflare API Token authentication for file uploads
 */

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID || '';
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || 'projectify-files';
const R2_API_TOKEN = process.env.R2_API_TOKEN || '';
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL || '';

// Cloudflare R2 API base URL
const R2_API_BASE = `https://api.cloudflare.com/client/v4/accounts/${R2_ACCOUNT_ID}/r2/buckets/${R2_BUCKET_NAME}/objects`;

/**
 * Upload a file to Cloudflare R2
 */
export async function uploadToR2(
  key: string,
  body: Buffer,
  contentType: string
): Promise<string> {
  const url = `${R2_API_BASE}/${encodeURIComponent(key)}`;

  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${R2_API_TOKEN}`,
      'Content-Type': contentType,
    },
    body: body,
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('R2 upload error:', error);
    throw new Error(`Failed to upload to R2: ${response.status}`);
  }

  // Return the public URL
  if (R2_PUBLIC_URL) {
    return `${R2_PUBLIC_URL}/${key}`;
  }
  
  // Fallback to constructing URL from account
  return `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${R2_BUCKET_NAME}/${key}`;
}

/**
 * Delete a file from Cloudflare R2
 */
export async function deleteFromR2(key: string): Promise<void> {
  const url = `${R2_API_BASE}/${encodeURIComponent(key)}`;

  const response = await fetch(url, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${R2_API_TOKEN}`,
    },
  });

  if (!response.ok && response.status !== 404) {
    const error = await response.text();
    console.error('R2 delete error:', error);
    throw new Error(`Failed to delete from R2: ${response.status}`);
  }
}

/**
 * Extract the key from a full R2 URL
 */
export function getKeyFromUrl(url: string): string | null {
  if (!url) return null;
  
  try {
    const urlObj = new URL(url);
    // Remove leading slash
    return urlObj.pathname.substring(1);
  } catch {
    return null;
  }
}

/**
 * Check if R2 is configured properly
 */
export function isR2Configured(): boolean {
  return !!(R2_ACCOUNT_ID && R2_API_TOKEN && R2_BUCKET_NAME);
}
