const {
  hashPassword,
  verifyPassword,
  generateAuditChecksum,
  generateRandomToken,
  hashToken,
  encrypt,
  decrypt,
} = require('../../../utils/crypto');

describe('Crypto Utilities', () => {
  // ── Argon2 Password Hashing ────────────────────────

  describe('hashPassword / verifyPassword', () => {
    test('should hash a password and verify it correctly', async () => {
      const password = 'StrongP@ss1';
      const hash = await hashPassword(password);

      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash.startsWith('$argon2')).toBe(true);

      const isValid = await verifyPassword(hash, password);
      expect(isValid).toBe(true);
    });

    test('should reject incorrect password', async () => {
      const hash = await hashPassword('CorrectP@ss1');
      const isValid = await verifyPassword(hash, 'WrongPassword1!');
      expect(isValid).toBe(false);
    });

    test('should generate different hashes for the same password', async () => {
      const password = 'StrongP@ss1';
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);
      expect(hash1).not.toBe(hash2); // Different salts
    });

    test('should handle invalid hash gracefully', async () => {
      const isValid = await verifyPassword('invalid-hash', 'password');
      expect(isValid).toBe(false);
    });
  });

  // ── SHA-256 Audit Checksums ────────────────────────

  describe('generateAuditChecksum', () => {
    test('should generate a consistent checksum for same inputs', () => {
      const params = {
        action: 'USER_LOGIN',
        actorId: 'user-123',
        resourceId: 'user-123',
        timestamp: '2024-01-01T00:00:00.000Z',
        previousChecksum: '',
      };

      const checksum1 = generateAuditChecksum(params);
      const checksum2 = generateAuditChecksum(params);

      expect(checksum1).toBe(checksum2);
      expect(checksum1).toHaveLength(64); // SHA-256 hex
    });

    test('should produce different checksums for different inputs', () => {
      const base = {
        action: 'USER_LOGIN',
        actorId: 'user-123',
        resourceId: 'user-123',
        timestamp: '2024-01-01T00:00:00.000Z',
        previousChecksum: '',
      };

      const cs1 = generateAuditChecksum(base);
      const cs2 = generateAuditChecksum({ ...base, action: 'USER_LOGOUT' });

      expect(cs1).not.toBe(cs2);
    });

    test('should chain with previous checksum', () => {
      const cs1 = generateAuditChecksum({
        action: 'USER_LOGIN',
        actorId: 'a',
        resourceId: 'b',
        timestamp: 't1',
        previousChecksum: '',
      });

      const cs2 = generateAuditChecksum({
        action: 'USER_LOGOUT',
        actorId: 'a',
        resourceId: 'b',
        timestamp: 't2',
        previousChecksum: cs1,
      });

      // Changing cs1 should break cs2
      const cs2_tampered = generateAuditChecksum({
        action: 'USER_LOGOUT',
        actorId: 'a',
        resourceId: 'b',
        timestamp: 't2',
        previousChecksum: 'tampered',
      });

      expect(cs2).not.toBe(cs2_tampered);
    });
  });

  // ── Token Generation ──────────────────────────────

  describe('generateRandomToken', () => {
    test('should generate a hex string', () => {
      const token = generateRandomToken();
      expect(token).toMatch(/^[0-9a-f]+$/);
    });

    test('should generate unique tokens', () => {
      const token1 = generateRandomToken();
      const token2 = generateRandomToken();
      expect(token1).not.toBe(token2);
    });

    test('should respect byte length parameter', () => {
      const token16 = generateRandomToken(16);
      const token32 = generateRandomToken(32);
      expect(token16).toHaveLength(32); // 16 bytes = 32 hex chars
      expect(token32).toHaveLength(64);
    });
  });

  describe('hashToken', () => {
    test('should return consistent SHA-256 hash', () => {
      const token = 'my-token';
      const hash1 = hashToken(token);
      const hash2 = hashToken(token);

      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64);
    });

    test('should produce different hashes for different tokens', () => {
      expect(hashToken('token1')).not.toBe(hashToken('token2'));
    });
  });

  // ── AES-256-GCM Encryption ────────────────────────

  describe('encrypt / decrypt', () => {
    const key = 'test-encryption-key-that-is-at-least-32-chars';

    test('should encrypt and decrypt correctly', () => {
      const plaintext = 'my-secret-totp-key';
      const encrypted = encrypt(plaintext, key);
      const decrypted = decrypt(encrypted, key);

      expect(decrypted).toBe(plaintext);
      expect(encrypted).not.toBe(plaintext);
    });

    test('should produce different ciphertext for same plaintext (random IV)', () => {
      const plaintext = 'same-text';
      const enc1 = encrypt(plaintext, key);
      const enc2 = encrypt(plaintext, key);

      expect(enc1).not.toBe(enc2);
    });

    test('should fail to decrypt with wrong key', () => {
      const encrypted = encrypt('secret', key);

      expect(() => {
        decrypt(encrypted, 'wrong-key-that-is-also-32-chars-long');
      }).toThrow();
    });

    test('encrypted format should be iv:authTag:ciphertext', () => {
      const encrypted = encrypt('test', key);
      const parts = encrypted.split(':');

      expect(parts).toHaveLength(3);
      expect(parts[0]).toMatch(/^[0-9a-f]+$/); // IV hex
      expect(parts[1]).toMatch(/^[0-9a-f]+$/); // AuthTag hex
      expect(parts[2]).toMatch(/^[0-9a-f]+$/); // Ciphertext hex
    });
  });
});
