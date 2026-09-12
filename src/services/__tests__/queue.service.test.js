const { redis } = require('../../config/redis');
const queueService = require('../queue.service');

jest.mock('../../config/redis', () => ({
  redis: {
    eval: jest.fn(),
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    zadd: jest.fn(),
    zrem: jest.fn(),
    zrangebyscore: jest.fn(),
    lpush: jest.fn(),
    rpop: jest.fn(),
    pipeline: jest.fn(() => ({
      set: jest.fn().mockReturnThis(),
      lpush: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([['OK'], [1]]),
    })),
  },
}));

describe('QueueService (Atomic Operations, Leases, Fencing & Checkpoints)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    queueService.stopAll();
  });

  afterAll(() => {
    queueService.stopAll();
  });

  describe('enqueue', () => {
    test('atomically enqueues a job with metadata and list insertion in one pipeline', async () => {
      const jobId = await queueService.enqueue('test-queue', { foo: 'bar' });

      expect(typeof jobId).toBe('string');
      expect(redis.pipeline).toHaveBeenCalled();
    });
  });

  describe('atomic claim without fallback', () => {
    test('aborts safely if atomic EVAL fails without performing non-atomic RPOP', async () => {
      // 1st eval = migrateDelayedJobs, 2nd eval = atomic claim
      redis.eval.mockResolvedValueOnce(0).mockRejectedValueOnce(new Error('Redis EVAL error'));

      // Start worker
      const mockHandler = jest.fn();
      queueService.registerWorker('error-queue', mockHandler);

      await queueService.processNext('error-queue');

      // Crucial: Must NOT call non-atomic rpop fallback!
      expect(redis.rpop).not.toHaveBeenCalled();
      expect(mockHandler).not.toHaveBeenCalled();
      expect(redis.eval).toHaveBeenCalledWith(
        expect.stringContaining('POP_AND_CLAIM'),
        2,
        'iam:queue:error-queue',
        'iam:queue:error-queue:processing',
        expect.any(Number),
        expect.any(String),
        expect.any(String)
      );
    });
  });

  describe('lease renewal & completion fencing', () => {
    test('renews lease via Lua script with caller claimToken', async () => {
      redis.eval.mockResolvedValueOnce(1);

      const renewed = await queueService.renewLease('test-queue', 'job-1', 'claim-tok-123');

      expect(renewed).toBe(1);
      expect(redis.eval).toHaveBeenCalledWith(
        expect.stringContaining('RENEW'),
        1,
        'iam:queue:test-queue:processing',
        'job-1',
        'claim-tok-123',
        expect.any(Number)
      );
    });

    test('finalizes and completes job only when claimToken matches', async () => {
      redis.eval.mockResolvedValueOnce(1);

      const completed = await queueService.completeJob('test-queue', 'job-1', 'claim-tok-123', {
        ok: true,
      });

      expect(completed).toBe(1);
      expect(redis.eval).toHaveBeenCalledWith(
        expect.stringContaining('COMPLETE'),
        1,
        'iam:queue:test-queue:processing',
        'job-1',
        'claim-tok-123',
        expect.any(String),
        JSON.stringify({ ok: true })
      );
    });
  });

  describe('atomic queue-state transitions (reclaim, delayed retry, DLQ)', () => {
    test('delayRetryJob transitions job atomically via Lua script', async () => {
      redis.eval.mockResolvedValueOnce(1);

      const result = await queueService.delayRetryJob(
        'test-queue',
        'job-1',
        'claim-tok-123',
        'Network error',
        2000
      );

      expect(result).toBe(1);
      expect(redis.eval).toHaveBeenCalledWith(
        expect.stringContaining('DELAY_RETRY'),
        2,
        'iam:queue:test-queue:processing',
        'iam:queue:test-queue:delayed',
        'job-1',
        'claim-tok-123',
        'Network error',
        expect.any(String),
        expect.any(String),
        expect.any(Number)
      );
    });

    test('moveToDlq transitions exhausted job atomically via Lua script', async () => {
      redis.eval.mockResolvedValueOnce(1);

      const result = await queueService.moveToDlq(
        'test-queue',
        'job-1',
        'claim-tok-123',
        'Fatal error'
      );

      expect(result).toBe(1);
      expect(redis.eval).toHaveBeenCalledWith(
        expect.stringContaining('DLQ'),
        2,
        'iam:queue:test-queue:processing',
        'iam:queue:test-queue:dlq',
        'job-1',
        'claim-tok-123',
        'Fatal error',
        expect.any(String)
      );
    });

    test('reclaimAbandonedJobs reclaims expired jobs in one atomic Lua script', async () => {
      redis.eval.mockResolvedValueOnce(2); // 2 jobs reclaimed

      await queueService.reclaimAbandonedJobs('test-queue');

      expect(redis.eval).toHaveBeenCalledWith(
        expect.stringContaining('RECLAIM'),
        3,
        'iam:queue:test-queue:processing',
        'iam:queue:test-queue',
        'iam:queue:test-queue:dlq',
        expect.any(Number),
        50,
        expect.any(String)
      );
    });
  });

  describe('atomic checkpointing', () => {
    test('checkpoint atomically merges updates and persists dedicated checkpoint key', async () => {
      redis.eval.mockResolvedValueOnce(1);
      redis.set.mockResolvedValueOnce('OK');

      await queueService.checkpoint('job-1', { emailDelivered: true }, 'claim-tok-123');

      expect(redis.eval).toHaveBeenCalledWith(
        expect.stringContaining('CHECKPOINT'),
        1,
        'iam:jobs:job-1',
        'job-1',
        'claim-tok-123',
        JSON.stringify({ emailDelivered: true }),
        expect.any(String)
      );
      expect(redis.set).toHaveBeenCalledWith(
        'iam:jobs:job-1:checkpoint',
        JSON.stringify({ emailDelivered: true }),
        'EX',
        86400
      );
    });

    test('checkpoint does NOT write dedicated checkpoint key if claimToken fence fails (res === -1)', async () => {
      redis.eval.mockResolvedValueOnce(-1); // Fence rejected

      await queueService.checkpoint('job-1', { emailDelivered: true }, 'stale-claim-tok');

      expect(redis.eval).toHaveBeenCalled();
      expect(redis.set).not.toHaveBeenCalled();
    });
  });

  describe('transient error handling & finalization isolation', () => {
    test('renewLease returns -1 on transient Redis error so heartbeat keeps running', async () => {
      redis.eval.mockRejectedValueOnce(new Error('Connection lost'));

      const result = await queueService.renewLease('test-queue', 'job-1', 'claim-tok-123');

      expect(result).toBe(-1);
    });

    test('processNext catches finalization error separately without triggering retry or DLQ', async () => {
      // 1. migrateDelayedJobs
      // 2. POP_AND_CLAIM_LUA
      // 3. COMPLETE_JOB_LUA rejects with Redis error
      const mockJob = {
        id: 'job-succ',
        queue: 'test-queue',
        payload: { task: 1 },
        attempts: 1,
        maxAttempts: 3,
        status: 'processing',
        checkpoint: {},
      };

      redis.eval
        .mockResolvedValueOnce(0) // migrateDelayedJobs
        .mockResolvedValueOnce(['job-succ', JSON.stringify(mockJob)]) // pop
        .mockRejectedValueOnce(new Error('Redis cluster failover during finalize')); // completeJob fails

      const mockHandler = jest.fn().mockResolvedValue({ success: true });
      queueService.registerWorker('test-finalize-err', mockHandler);

      await queueService.processNext('test-finalize-err');

      expect(mockHandler).toHaveBeenCalled();
      // Crucial: Must NOT have called DELAY_RETRY or DLQ because handler actually succeeded!
      const evaluatedScripts = redis.eval.mock.calls.map(([script]) => script);
      expect(evaluatedScripts.some((script) => script.includes('DELAY_RETRY'))).toBe(false);
      expect(evaluatedScripts.some((script) => script.includes('DLQ'))).toBe(false);
    });
  });
});
