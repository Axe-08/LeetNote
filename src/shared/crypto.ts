// AES-GCM 256 Encryption Service using WebCrypto API
import browser from 'webextension-polyfill';
import { AppError } from './types';

// Deterministic key derivation base material
const SALT = new TextEncoder().encode('leetnote-v1');
const ITERATIONS = 100000;

// Derives a cryptographic key from browser metadata
async function getEncryptionKey(): Promise<CryptoKey> {
  try {
    // Falls back to a default extension ID if runtime.id is undefined (e.g., during tests)
    const extensionId = browser?.runtime?.id || 'leetnote-default-extension-id';
    const userAgent = navigator.userAgent;
    const keyMaterialString = extensionId + userAgent;
    const keyMaterial = new TextEncoder().encode(keyMaterialString);

    const baseKey = await crypto.subtle.importKey(
      'raw',
      keyMaterial,
      'PBKDF2',
      false,
      ['deriveKey']
    );

    return await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: SALT,
        iterations: ITERATIONS,
        hash: 'SHA-256',
      },
      baseKey,
      {
        name: 'AES-GCM',
        length: 256,
      },
      false,
      ['encrypt', 'decrypt']
    );
  } catch (err) {
    throw new AppError('LN_700', `Key derivation failed: ${err instanceof Error ? err.message : String(err)}`);
  }
}

/**
 * Encrypts a plaintext token using AES-GCM 256
 */
export async function encryptToken(token: string): Promise<string> {
  try {
    const key = await getEncryptionKey();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encodedToken = new TextEncoder().encode(token);

    const ciphertext = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv,
      },
      key,
      encodedToken
    );

    // Combine IV and Ciphertext into a single array
    const combined = new Uint8Array(iv.length + ciphertext.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(ciphertext), iv.length);

    // Convert to Base64
    const binString = Array.from(combined, (byte) => String.fromCharCode(byte)).join('');
    return btoa(binString);
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError('LN_700', `Encryption failed: ${err instanceof Error ? err.message : String(err)}`);
  }
}

/**
 * Decrypts a base64 encoded AES-GCM 256 ciphertext
 */
export async function decryptToken(encrypted: string): Promise<string> {
  try {
    const key = await getEncryptionKey();
    
    // Decode Base64
    const binString = atob(encrypted);
    const combined = new Uint8Array(binString.length);
    for (let i = 0; i < binString.length; i++) {
      combined[i] = binString.charCodeAt(i);
    }

    if (combined.length < 12) {
      throw new AppError('LN_700', 'Invalid encrypted token format');
    }

    // Extract IV and Ciphertext
    const iv = combined.slice(0, 12);
    const ciphertext = combined.slice(12);

    const decrypted = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv,
      },
      key,
      ciphertext
    );

    return new TextDecoder().decode(decrypted);
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError('LN_700', `Decryption failed: ${err instanceof Error ? err.message : String(err)}`);
  }
}
