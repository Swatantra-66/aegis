const { generateAuditChecksum } = require('../../../utils/crypto');

describe('Audit Checksum Chain', () => {
  test('should create a valid checksum chain', () => {
    // Simulate 3 audit entries
    const entry1 = {
      action: 'USER_REGISTERED',
      actorId: 'user-1',
      resourceId: 'user-1',
      timestamp: '2024-01-01T00:00:00.000Z',
      previousChecksum: '',
    };
    const cs1 = generateAuditChecksum(entry1);
    expect(cs1).toHaveLength(64);

    const entry2 = {
      action: 'USER_LOGIN',
      actorId: 'user-1',
      resourceId: 'user-1',
      timestamp: '2024-01-01T00:01:00.000Z',
      previousChecksum: cs1,
    };
    const cs2 = generateAuditChecksum(entry2);

    const entry3 = {
      action: 'USER_LOGOUT',
      actorId: 'user-1',
      resourceId: 'user-1',
      timestamp: '2024-01-01T00:02:00.000Z',
      previousChecksum: cs2,
    };
    const cs3 = generateAuditChecksum(entry3);

    // All checksums should be unique
    expect(new Set([cs1, cs2, cs3]).size).toBe(3);
  });

  test('should detect tampering in the chain', () => {
    const cs1 = generateAuditChecksum({
      action: 'USER_LOGIN',
      actorId: 'user-1',
      resourceId: 'user-1',
      timestamp: '2024-01-01T00:00:00.000Z',
      previousChecksum: '',
    });

    // Original entry2 checksum
    const cs2_original = generateAuditChecksum({
      action: 'ROLE_ASSIGNED',
      actorId: 'admin-1',
      resourceId: 'user-1',
      timestamp: '2024-01-01T00:01:00.000Z',
      previousChecksum: cs1,
    });

    // Tampered entry2 (changed action)
    const cs2_tampered = generateAuditChecksum({
      action: 'ROLE_DELETED',
      actorId: 'admin-1',
      resourceId: 'user-1',
      timestamp: '2024-01-01T00:01:00.000Z',
      previousChecksum: cs1,
    });

    // Checksums should differ, proving tampering is detectable
    expect(cs2_original).not.toBe(cs2_tampered);

    // Entry3 depending on cs2_original will not match if cs2 was tampered
    const cs3_valid = generateAuditChecksum({
      action: 'USER_LOGOUT',
      actorId: 'user-1',
      resourceId: 'user-1',
      timestamp: '2024-01-01T00:02:00.000Z',
      previousChecksum: cs2_original,
    });

    const cs3_broken = generateAuditChecksum({
      action: 'USER_LOGOUT',
      actorId: 'user-1',
      resourceId: 'user-1',
      timestamp: '2024-01-01T00:02:00.000Z',
      previousChecksum: cs2_tampered,
    });

    expect(cs3_valid).not.toBe(cs3_broken);
  });

  test('should handle null actorId and resourceId', () => {
    const cs = generateAuditChecksum({
      action: 'SYSTEM_STARTUP',
      actorId: null,
      resourceId: null,
      timestamp: '2024-01-01T00:00:00.000Z',
      previousChecksum: '',
    });

    expect(cs).toHaveLength(64);
  });
});
