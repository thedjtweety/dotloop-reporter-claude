/**
 * Token Encryption Utilities
 * 
 * Provides AES-256-GCM encryption for OAuth tokens with support for key rotation.
 * All tokens are encrypted at rest and only decrypted when needed for API calls.
 */

import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const KEY_LENGTH = 32; // 256 bits

interface EncryptionKey {
  version: number;
  key: Buffer;
}

class TokenEncryption {
  private keys: Map<number, Buffer> = new Map();
  private currentKeyVersion: number = 1;

  constructor() {
    this.loadEncryptionKeys();
  }

  /**
   * Loads encryption keys from environment variables
   * Supports multiple key versions for rotation
   */
  private loadEncryptionKeys(): void {
    // Load current key (optional until OAuth is configured)
    const currentKey = process.env.TOKEN_ENCRYPTION_KEY;
    if (!currentKey) {
      console.warn(
        '[Token Encryption] TOKEN_ENCRYPTION_KEY not set. ' +
        'OAuth token encryption will not be available. ' +
        'Generate with: openssl rand -hex 32'
      );
      return; // Skip key loading if not configured
    }

    // Validate key length
    const keyBuffer = Buffer.from(currentKey, 'hex');
    if (keyBuffer.length !== KEY_LENGTH) {
      throw new Error(
        `TOKEN_ENCRYPTION_KEY must be ${KEY_LENGTH} bytes (64 hex characters). ` +
        `Current length: ${keyBuffer.length} bytes`
      );
    }

    this.keys.set(1, keyBuffer);
    this.currentKeyVersion = 1;

    // Load additional key versions for rotation support (optional)
    for (let version = 2; version <= 10; version++) {
      const key = process.env[`TOKEN_ENCRYPTION_KEY_V${version}`];
      if (key) {
        const versionKeyBuffer = Buffer.from(key, 'hex');
        if (versionKeyBuffer.length !== KEY_LENGTH) {
          console.warn(
            `Skipping TOKEN_ENCRYPTION_KEY_V${version}: Invalid key length`
          );
          continue;
        }
        this.keys.set(version, versionKeyBuffer);
        this.currentKeyVersion = Math.max(this.currentKeyVersion, version);
      }
    }

    console.log(
      `[TokenEncryption] Loaded ${this.keys.size} encryption key(s), ` +
      `current version: ${this.currentKeyVersion}`
    );
  }

  /**
   * Encrypts a token using AES-256-GCM
   * 
   * @param token - The plaintext token to encrypt
   * @param keyVersion - Optional key version (defaults to current)
   * @returns Encrypted token in format: version:iv:authTag:encryptedData
   */
  encrypt(token: string, keyVersion?: number): string {
    if (this.keys.size === 0) {
      throw new Error(
        'TOKEN_ENCRYPTION_KEY not configured. ' +
        'Cannot encrypt tokens without encryption key. ' +
        'Set TOKEN_ENCRYPTION_KEY environment variable.'
      );
    }

    const version = keyVersion || this.currentKeyVersion;
    const key = this.keys.get(version);

    if (!key) {
      throw new Error(`Encryption key version ${version} not found`);
    }

    // Generate random initialization vector
    const iv = crypto.randomBytes(IV_LENGTH);

    // Create cipher
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    // Encrypt token
    let encrypted = cipher.update(token, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    // Get authentication tag for integrity verification
    const authTag = cipher.getAuthTag();

    // Return format: version:iv:authTag:encryptedData
    return `${version}:${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }

  /**
   * Decrypts an encrypted token
   * Automatically detects and uses the correct key version
   * 
   * @param encryptedToken - The encrypted token string
   * @returns Decrypted plaintext token
   * @throws Error if decryption fails (tampering detected)
   */
  decrypt(encryptedToken: string): string {
    if (this.keys.size === 0) {
      throw new Error(
        'TOKEN_ENCRYPTION_KEY not configured. ' +
        'Cannot decrypt tokens without encryption key. ' +
        'Set TOKEN_ENCRYPTION_KEY environment variable.'
      );
    }

    const parts = encryptedToken.split(':');
    if (parts.length !== 4) {
      throw new Error(
        'Invalid encrypted token format. Expected: version:iv:authTag:data'
      );
    }

    const [versionStr, ivHex, authTagHex, encrypted] = parts;
    const version = parseInt(versionStr, 10);

    if (isNaN(version)) {
      throw new Error(`Invalid key version: ${versionStr}`);
    }

    const key = this.keys.get(version);
    if (!key) {
      throw new Error(
        `Decryption key version ${version} not found. ` +
        `Available versions: ${Array.from(this.keys.keys()).join(', ')}`
      );
    }

    try {
      // Create decipher
      const decipher = crypto.createDecipheriv(
        ALGORITHM,
        key,
        Buffer.from(ivHex, 'hex')
      );

      // Set authentication tag for integrity verification
      decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));

      // Decrypt token
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      // Decryption failure indicates tampering or corruption
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(
        'Token decryption failed - possible tampering detected. ' +
        `Original error: ${errorMessage}`
      );
    }
  }

  /**
   * Creates SHA-256 hash of token for database lookups
   * Allows token lookup without decryption
   * 
   * @param token - The plaintext token
   * @returns SHA-256 hash as hex string
   */
  hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Re-encrypts a token with a new key version
   * Used during key rotation
   * 
   * @param encryptedToken - The currently encrypted token
   * @param newKeyVersion - The new key version to use
   * @returns Token encrypted with new key version
   */
  reencrypt(encryptedToken: string, newKeyVersion: number): string {
    // Decrypt with old key
    const decrypted = this.decrypt(encryptedToken);
    
    // Encrypt with new key
    return this.encrypt(decrypted, newKeyVersion);
  }

  /**
   * Gets the current encryption key version
   */
  getCurrentKeyVersion(): number {
    return this.currentKeyVersion;
  }

  /**
   * Gets all available key versions
   */
  getAvailableKeyVersions(): number[] {
    return Array.from(this.keys.keys()).sort((a, b) => a - b);
  }

  /**
   * Validates that an encrypted token can be decrypted
   * Useful for testing and validation
   * 
   * @param encryptedToken - The encrypted token to validate
   * @returns true if token can be decrypted, false otherwise
   */
  validateEncryptedToken(encryptedToken: string): boolean {
    try {
      this.decrypt(encryptedToken);
      return true;
    } catch {
      return false;
    }
  }
}

// Singleton instance
export const tokenEncryption = new TokenEncryption();

/**
 * SecureToken class for memory-safe token handling
 * Automatically zeros memory when token is no longer needed
 */
export class SecureToken {
  private buffer: Buffer | null;
  private destroyed: boolean = false;

  constructor(token: string) {
    this.buffer = Buffer.from(token, 'utf8');
  }

  /**
   * Gets the token value
   * @throws Error if token has been destroyed
   */
  getValue(): string {
    if (this.destroyed) {
      throw new Error('Cannot access destroyed token');
    }
    if (!this.buffer) {
      throw new Error('Token buffer is null');
    }
    return this.buffer.toString('utf8');
  }

  /**
   * Destroys the token by zeroing its memory
   * Should be called as soon as token is no longer needed
   */
  destroy(): void {
    if (this.buffer) {
      // Overwrite buffer with zeros to remove from memory
      this.buffer.fill(0);
      this.buffer = null;
    }
    this.destroyed = true;
  }

  /**
   * Checks if token has been destroyed
   */
  isDestroyed(): boolean {
    return this.destroyed;
  }

  /**
   * Symbol.dispose for automatic cleanup with 'using' keyword (TypeScript 5.2+)
   */
  [Symbol.dispose](): void {
    this.destroy();
  }
}

/**
 * Utility function to execute code with a secure token that auto-destroys
 * 
 * @example
 * await withSecureToken(encryptedToken, async (token) => {
 *   await apiCall(token);
 * });
 * // Token automatically destroyed after callback
 */
export async function withSecureToken<T>(
  encryptedToken: string,
  callback: (token: string) => Promise<T>
): Promise<T> {
  const secureToken = new SecureToken(tokenEncryption.decrypt(encryptedToken));
  try {
    return await callback(secureToken.getValue());
  } finally {
    secureToken.destroy();
  }
}

// ─── Convenience exports (used by dotloop-token-service and OAuth routes) ─────

/**
 * Encrypt a plaintext token. Returns format: version:iv:authTag:data
 * Never logs plaintext.
 */
export function encryptToken(plaintext: string): string {
  return tokenEncryption.encrypt(plaintext);
}

/**
 * Decrypt an encrypted token string back to plaintext.
 * Never logs plaintext.
 */
export function decryptToken(encrypted: string): string {
  return tokenEncryption.decrypt(encrypted);
}
