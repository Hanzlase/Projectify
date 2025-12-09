import crypto from 'crypto';

// Use a secure key from environment variables
const ENCRYPTION_KEY = process.env.MESSAGE_ENCRYPTION_KEY || 'projectify-secure-key-32chars!!'; // Must be 32 characters
const IV_LENGTH = 16; // For AES, this is always 16
const ALGORITHM = 'aes-256-cbc';

/**
 * Encrypts a message using AES-256-CBC
 * @param text - The plaintext message to encrypt
 * @returns The encrypted message as base64 string with IV prepended
 */
export function encryptMessage(text: string): string {
  if (!text) return text;
  
  try {
    // Generate a random IV for each encryption
    const iv = crypto.randomBytes(IV_LENGTH);
    
    // Create cipher with key and IV
    const cipher = crypto.createCipheriv(
      ALGORITHM, 
      Buffer.from(ENCRYPTION_KEY.padEnd(32).slice(0, 32)), 
      iv
    );
    
    // Encrypt the text
    let encrypted = cipher.update(text, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    
    // Prepend IV to encrypted text (IV:encrypted)
    return iv.toString('base64') + ':' + encrypted;
  } catch (error) {
    console.error('Encryption error:', error);
    return text; // Return original text if encryption fails
  }
}

/**
 * Decrypts a message encrypted with encryptMessage
 * @param encryptedText - The encrypted message (IV:ciphertext format)
 * @returns The decrypted plaintext message
 */
export function decryptMessage(encryptedText: string): string {
  if (!encryptedText) return encryptedText;
  
  try {
    // Check if the text is in encrypted format (contains :)
    if (!encryptedText.includes(':')) {
      // Not encrypted (legacy message), return as-is
      return encryptedText;
    }
    
    // Split IV and encrypted text
    const parts = encryptedText.split(':');
    if (parts.length !== 2) {
      return encryptedText; // Invalid format, return as-is
    }
    
    const iv = Buffer.from(parts[0], 'base64');
    const encrypted = parts[1];
    
    // Validate IV length
    if (iv.length !== IV_LENGTH) {
      return encryptedText; // Invalid IV, return as-is (might be legacy)
    }
    
    // Create decipher with key and IV
    const decipher = crypto.createDecipheriv(
      ALGORITHM, 
      Buffer.from(ENCRYPTION_KEY.padEnd(32).slice(0, 32)), 
      iv
    );
    
    // Decrypt the text
    let decrypted = decipher.update(encrypted, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    // Return original text if decryption fails (might be legacy unencrypted message)
    return encryptedText;
  }
}

/**
 * Check if a message appears to be encrypted
 * @param text - The text to check
 * @returns True if the message appears to be encrypted
 */
export function isEncrypted(text: string): boolean {
  if (!text || !text.includes(':')) return false;
  
  const parts = text.split(':');
  if (parts.length !== 2) return false;
  
  try {
    const iv = Buffer.from(parts[0], 'base64');
    return iv.length === IV_LENGTH;
  } catch {
    return false;
  }
}
