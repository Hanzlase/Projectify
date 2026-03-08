import crypto from 'crypto';

// Use a secure key from environment variables
const ENCRYPTION_KEY = process.env.MESSAGE_ENCRYPTION_KEY || 'projectify-secure-key-32chars!!'; // Must be 32 characters
const GCM_IV_LENGTH = 12;  // 96-bit IV recommended for AES-GCM
const GCM_AUTH_TAG_LENGTH = 16; // 128-bit authentication tag
const ALGORITHM = 'aes-256-gcm';

// Derive a fixed 32-byte key buffer once
function getKeyBuffer(): Buffer {
  return Buffer.from(ENCRYPTION_KEY.padEnd(32).slice(0, 32));
}

/**
 * Encrypts a message using AES-256-GCM (authenticated encryption).
 * Format: base64(iv):base64(authTag):base64(ciphertext)
 */
export function encryptMessage(text: string): string {
  if (!text) return text;

  try {
    const iv = crypto.randomBytes(GCM_IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, getKeyBuffer(), iv) as crypto.CipherGCM;

    let encrypted = cipher.update(text, 'utf8', 'base64');
    encrypted += cipher.final('base64');

    const authTag = cipher.getAuthTag();

    // Format: iv:authTag:ciphertext  (all base64)
    return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`;
  } catch (error) {
    console.error('Encryption error:', error);
    return text;
  }
}

/**
 * Decrypts a message encrypted with encryptMessage.
 * Handles both the new GCM format (iv:authTag:ciphertext) and legacy
 * CBC format (iv:ciphertext) so existing messages continue to work.
 */
export function decryptMessage(encryptedText: string): string {
  if (!encryptedText) return encryptedText;

  try {
    if (!encryptedText.includes(':')) {
      // Plain legacy message — return as-is
      return encryptedText;
    }

    const parts = encryptedText.split(':');

    // --- New GCM format: 3 parts ---
    if (parts.length === 3) {
      const iv = Buffer.from(parts[0], 'base64');
      const authTag = Buffer.from(parts[1], 'base64');
      const encrypted = parts[2];

      if (iv.length !== GCM_IV_LENGTH || authTag.length !== GCM_AUTH_TAG_LENGTH) {
        return encryptedText; // Unrecognised format, return as-is
      }

      const decipher = crypto.createDecipheriv(ALGORITHM, getKeyBuffer(), iv) as crypto.DecipherGCM;
      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(encrypted, 'base64', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    }

    // --- Legacy CBC format: 2 parts (iv:ciphertext) ---
    if (parts.length === 2) {
      const iv = Buffer.from(parts[0], 'base64');
      const encrypted = parts[1];

      if (iv.length !== 16) {
        return encryptedText;
      }

      const decipher = crypto.createDecipheriv('aes-256-cbc', getKeyBuffer(), iv);
      let decrypted = decipher.update(encrypted, 'base64', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    }

    return encryptedText;
  } catch (error) {
    console.error('Decryption error:', error);
    return encryptedText;
  }
}

/**
 * Check if a message appears to be encrypted (GCM or legacy CBC format).
 */
export function isEncrypted(text: string): boolean {
  if (!text || !text.includes(':')) return false;

  const parts = text.split(':');

  // New GCM format: 3 parts
  if (parts.length === 3) {
    try {
      const iv = Buffer.from(parts[0], 'base64');
      const authTag = Buffer.from(parts[1], 'base64');
      return iv.length === GCM_IV_LENGTH && authTag.length === GCM_AUTH_TAG_LENGTH;
    } catch {
      return false;
    }
  }

  // Legacy CBC format: 2 parts
  if (parts.length === 2) {
    try {
      const iv = Buffer.from(parts[0], 'base64');
      return iv.length === 16;
    } catch {
      return false;
    }
  }

  return false;
}
