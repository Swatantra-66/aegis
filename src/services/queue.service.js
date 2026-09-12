const { redis } = require('../config/redis');
const logger = require('../utils/logger');
const { generateRandomToken } = require('../utils/crypto');

/**
 * Server-side Lua script to atomically migrate ready delayed jobs into the active queue.
 * KEYS[1] = delayedKey (ZSET), KEYS[2] = queueKey (LIST)
 * ARGV[1] = currentTimestamp (milliseconds)
 */
const MIGRATE_DELAYED_JOBS_LUA = `
  local ready = redis.call('ZRANGEBYSCORE', KEYS[1], 0, ARGV[1])
  for _, id in ipairs(ready) do
    redis.call('ZREM', KEYS[1], id)
    redis.call('LPUSH', KEYS[2], id)
  end
  return #ready
`;

/**
 * Server-side Lua script to atomically pop a job from the active queue,
 * attach a unique claimToken, set status to processing, and add to processing ZSET with visibility lease.
 * KEYS[1] = queueKey (LIST), KEYS[2] = processingKey (ZSET)
 * ARGV[1] = leaseExpiresAt (ms), ARGV[2] = claimToken (string), ARGV[3] = nowIso (string)
 * Returns { jobId, jobJson } or nil if empty
 */
const POP_AND_CLAIM_LUA = `
  -- POP_AND_CLAIM_LUA
  local jobId = redis.call('RPOP', KEYS[1])
  if not jobId then
    return nil
  end
  local jobKey = 'iam:jobs:' .. jobId
  local jobStr = redis.call('GET', jobKey)
  if not jobStr then
    return { jobId, '' }
  end
  local job = cjson.decode(jobStr)
  job.attempts = (job.attempts or 0) + 1
  job.claimToken = ARGV[2]
  job.status = 'processing'
  job.updatedAt = ARGV[3]
  redis.call('SET', jobKey, cjson.encode(job), 'EX', 86400)
  redis.call('ZADD', KEYS[2], tonumber(ARGV[1]), jobId)
  return { jobId, cjson.encode(job) }
`;

/**
 * Server-side Lua script to renew an active job's visibility lease.
 * Fenced: only renews if stored claimToken strictly matches caller's claimToken.
 * KEYS[1] = processingKey (ZSET)
 * ARGV[1] = jobId, ARGV[2] = claimToken, ARGV[3] = newLeaseExpiresAt (ms)
 * Returns 1 if renewed, 0 if ownership lost or missing
 */
const RENEW_LEASE_LUA = `
  -- RENEW_LEASE_LUA
  local jobKey = 'iam:jobs:' .. ARGV[1]
  local jobStr = redis.call('GET', jobKey)
  if not jobStr then
    redis.call('ZREM', KEYS[1], ARGV[1])
    return 0
  end
  local job = cjson.decode(jobStr)
  if job.claimToken ~= ARGV[2] then
    return 0
  end
  redis.call('ZADD', KEYS[1], tonumber(ARGV[3]), ARGV[1])
  return 1
`;

/**
 * Server-side Lua script to atomically complete a job.
 * Fenced: only completes and removes from processing ZSET if stored claimToken matches caller's claimToken.
 * KEYS[1] = processingKey (ZSET)
 * ARGV[1] = jobId, ARGV[2] = claimToken, ARGV[3] = nowIso, ARGV[4] = resultJson
 * Returns 1 if completed, 0 if ownership lost
 */
const COMPLETE_JOB_LUA = `
  -- COMPLETE_JOB_LUA
  local jobKey = 'iam:jobs:' .. ARGV[1]
  local jobStr = redis.call('GET', jobKey)
  if not jobStr then
    redis.call('ZREM', KEYS[1], ARGV[1])
    return 0
  end
  local job = cjson.decode(jobStr)
  if job.claimToken ~= ARGV[2] then
    return 0
  end
  job.status = 'completed'
  job.completedAt = ARGV[3]
  job.updatedAt = ARGV[3]
  if ARGV[4] ~= '' then
    job.result = cjson.decode(ARGV[4])
  end
  redis.call('SET', jobKey, cjson.encode(job), 'EX', 3600)
  redis.call('ZREM', KEYS[1], ARGV[1])
  return 1
`;

/**
 * Server-side Lua script to atomically transition a failed job to delayed retry.
 * Fenced by claimToken.
 * KEYS[1] = processingKey (ZSET), KEYS[2] = delayedKey (ZSET)
 * ARGV[1] = jobId, ARGV[2] = claimToken, ARGV[3] = errorMsg, ARGV[4] = retryAtIso, ARGV[5] = nowIso, ARGV[6] = executeAtMs
 * Returns 1 if transitioned, 0 if ownership lost
 */
const DELAY_RETRY_JOB_LUA = `
  -- DELAY_RETRY_JOB_LUA
  local jobKey = 'iam:jobs:' .. ARGV[1]
  local jobStr = redis.call('GET', jobKey)
  if not jobStr then
    redis.call('ZREM', KEYS[1], ARGV[1])
    return 0
  end
  local job = cjson.decode(jobStr)
  if job.claimToken ~= ARGV[2] then
    return 0
  end
  job.status = 'delayed'
  job.lastError = ARGV[3]
  job.retryAt = ARGV[4]
  job.updatedAt = ARGV[5]
  redis.call('SET', jobKey, cjson.encode(job), 'EX', 86400)
  redis.call('ZREM', KEYS[1], ARGV[1])
  redis.call('ZADD', KEYS[2], tonumber(ARGV[6]), ARGV[1])
  return 1
`;

/**
 * Server-side Lua script to atomically transition an exhausted job to DLQ.
 * Fenced by claimToken.
 * KEYS[1] = processingKey (ZSET), KEYS[2] = dlqKey (LIST)
 * ARGV[1] = jobId, ARGV[2] = claimToken, ARGV[3] = errorMsg, ARGV[4] = nowIso
 * Returns 1 if transitioned, 0 if ownership lost
 */
const DLQ_JOB_LUA = `
  -- DLQ_JOB_LUA
  local jobKey = 'iam:jobs:' .. ARGV[1]
  local jobStr = redis.call('GET', jobKey)
  if not jobStr then
    redis.call('ZREM', KEYS[1], ARGV[1])
    return 0
  end
  local job = cjson.decode(jobStr)
  if job.claimToken ~= ARGV[2] then
    return 0
  end
  job.status = 'failed'
  job.lastError = ARGV[3]
  job.failedAt = ARGV[4]
  job.updatedAt = ARGV[4]
  redis.call('SET', jobKey, cjson.encode(job), 'EX', 604800)
  redis.call('ZREM', KEYS[1], ARGV[1])
  redis.call('LPUSH', KEYS[2], ARGV[1])
  return 1
`;

/**
 * Server-side Lua script to atomically reclaim expired processing entries.
 * Reclaims directly to active queue if attempts < maxAttempts, or moves to DLQ if maxAttempts reached.
 * KEYS[1] = processingKey (ZSET), KEYS[2] = queueKey (LIST), KEYS[3] = dlqKey (LIST)
 * ARGV[1] = nowMs, ARGV[2] = batchLimit, ARGV[3] = nowIso
 * Returns number of reclaimed jobs
 */
const RECLAIM_EXPIRED_JOBS_LUA = `
  -- RECLAIM_EXPIRED_JOBS_LUA
  local expired = redis.call('ZRANGEBYSCORE', KEYS[1], 0, ARGV[1], 'LIMIT', 0, tonumber(ARGV[2]))
  local count = 0
  for _, jobId in ipairs(expired) do
    local jobKey = 'iam:jobs:' .. jobId
    local jobStr = redis.call('GET', jobKey)
    if not jobStr then
      redis.call('ZREM', KEYS[1], jobId)
    else
      local job = cjson.decode(jobStr)
      if job.status == 'completed' then
        redis.call('ZREM', KEYS[1], jobId)
      elseif (job.attempts or 0) < (job.maxAttempts or 3) then
        job.status = 'pending'
        job.claimToken = nil
        job.updatedAt = ARGV[3]
        redis.call('SET', jobKey, cjson.encode(job), 'EX', 86400)
        redis.call('ZREM', KEYS[1], jobId)
        redis.call('LPUSH', KEYS[2], jobId)
        count = count + 1
      else
        job.status = 'failed'
        job.failedAt = ARGV[3]
        job.updatedAt = ARGV[3]
        redis.call('SET', jobKey, cjson.encode(job), 'EX', 604800)
        redis.call('ZREM', KEYS[1], jobId)
        redis.call('LPUSH', KEYS[3], jobId)
        count = count + 1
      end
    end
  end
  return count
`;

/**
 * Server-side Lua script to atomically merge checkpoint data without overwriting job state.
 * Never mutates status, attempts, or claimToken. Fenced by claimToken if provided.
 * KEYS[1] = jobKey
 * ARGV[1] = jobId, ARGV[2] = claimToken, ARGV[3] = updatesJson, ARGV[4] = nowIso
 * Returns 1 if updated, 0 if job not found, -1 if claimToken fence violated
 */
const CHECKPOINT_JOB_LUA = `
  -- CHECKPOINT_JOB_LUA
  local jobStr = redis.call('GET', KEYS[1])
  if not jobStr then return 0 end
  local job = cjson.decode(jobStr)
  if ARGV[2] ~= '' and job.claimToken ~= ARGV[2] then
    return -1
  end
  local updates = cjson.decode(ARGV[3])
  if not job.checkpoint then job.checkpoint = {} end
  for k, v in pairs(updates) do
    job.checkpoint[k] = v
  end
  job.updatedAt = ARGV[4]
  redis.call('SET', KEYS[1], cjson.encode(job), 'KEEPTTL')
  return 1
`;

/**
 * Durable Background Job Queue Service backed by Redis.
 * - Atomic job creation & queue insertion (via Redis pipeline)
 * - Atomic pop & visibility lease with unique claim tokens
 * - Active lease renewal (heartbeat) during execution
 * - Atomic queue state transitions (reclaim, delayed retry, DLQ) via Lua scripts
 * - Atomic checkpointing with fencing that preserves job state
 */
class QueueService {
  constructor() {
    this.workers = new Map();
    this.isProcessing = new Map();
    this.pollIntervals = new Map();
    this.visibilityTimeoutMs = 60000; // 60s visibility lease for in-flight jobs
  }

  /**
   * Register a worker processor for a specific queue.
   * @param {string} queueName
   * @param {Function} handler - async (payload, job) => Promise<any>
   */
  registerWorker(queueName, handler) {
    this.workers.set(queueName, handler);
    this.startWorker(queueName);
  }

  /**
   * Enqueue an idempotent, durable job in Redis.
   * Uses Redis pipeline to guarantee atomic job metadata write and queue push.
   *
   * @param {string} queueName
   * @param {Object} payload
   * @param {Object} [options={}]
   * @param {number} [options.maxAttempts=3]
   * @param {string} [options.jobId]
   * @returns {Promise<string>} jobId
   */
  async enqueue(queueName, payload, options = {}) {
    const jobId = options.jobId || generateRandomToken(16);
    const maxAttempts = options.maxAttempts || 3;
    const queueKey = `iam:queue:${queueName}`;
    const jobKey = `iam:jobs:${jobId}`;

    const job = {
      id: jobId,
      queue: queueName,
      payload,
      attempts: 0,
      maxAttempts,
      status: 'pending',
      checkpoint: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Atomic execution: write job metadata and push to queue in one Redis tick
    const pipeline = redis.pipeline ? redis.pipeline() : redis.multi();
    pipeline.set(jobKey, JSON.stringify(job), 'EX', 86400);
    pipeline.lpush(queueKey, jobId);
    await pipeline.exec();

    // Trigger immediate queue drain
    setImmediate(() => {
      this.processNext(queueName).catch((err) => {
        logger.error(`Error draining queue [${queueName}]: ${err.message}`);
      });
    });

    return jobId;
  }

  /**
   * Persist a checkpoint update atomically without overwriting newer job state.
   * @param {string} jobId
   * @param {Object} updates
   * @param {string} [claimToken='']
   */
  async checkpoint(jobId, updates = {}, claimToken = '') {
    const jobKey = `iam:jobs:${jobId}`;
    const nowIso = new Date().toISOString();

    try {
      // 1. Atomically merge checkpoint fields into job metadata using Lua CAS
      const res = await redis.eval(
        CHECKPOINT_JOB_LUA,
        1,
        jobKey,
        jobId,
        claimToken,
        JSON.stringify(updates),
        nowIso
      );

      // 2. Store in dedicated checkpoint key only for the confirmed owner
      if (res === 1) {
        await redis.set(`iam:jobs:${jobId}:checkpoint`, JSON.stringify(updates), 'EX', 86400);
      }

      if (res === -1) {
        logger.warn(`Checkpoint for job [${jobId}] rejected: claimToken mismatch`);
      }
    } catch (err) {
      logger.error(`Failed to persist checkpoint for job [${jobId}]: ${err.message}`);
    }
  }

  /**
   * Start worker processing and maintenance loops.
   * @param {string} queueName
   */
  startWorker(queueName) {
    if (this.pollIntervals.has(queueName)) {
      return;
    }

    // Process immediately
    setImmediate(() => {
      this.processNext(queueName).catch(() => {});
    });

    // Periodic sweep: reclaim abandoned jobs and migrate ready delayed jobs
    const interval = setInterval(async () => {
      try {
        await this.migrateDelayedJobs(queueName);
        await this.reclaimAbandonedJobs(queueName);
        await this.processNext(queueName);
      } catch (err) {
        logger.error(`Periodic sweep error for queue [${queueName}]: ${err.message}`);
      }
    }, 5000);

    if (typeof interval.unref === 'function') {
      interval.unref();
    }

    this.pollIntervals.set(queueName, interval);
  }

  /**
   * Atomically migrate ready delayed jobs to the active queue.
   * @param {string} queueName
   */
  async migrateDelayedJobs(queueName) {
    const delayedKey = `iam:queue:${queueName}:delayed`;
    const queueKey = `iam:queue:${queueName}`;
    const now = Date.now();

    try {
      await redis.eval(MIGRATE_DELAYED_JOBS_LUA, 2, delayedKey, queueKey, now);
    } catch (err) {
      logger.error(`Failed migrating delayed jobs for [${queueName}]: ${err.message}`);
    }
  }

  /**
   * Atomically reclaim jobs whose visibility lease in the processing ZSET has expired.
   * Prevents jobs from being dropped between ZREM and destination insertion.
   * @param {string} queueName
   */
  async reclaimAbandonedJobs(queueName) {
    const processingKey = `iam:queue:${queueName}:processing`;
    const queueKey = `iam:queue:${queueName}`;
    const dlqKey = `iam:queue:${queueName}:dlq`;
    const now = Date.now();
    const nowIso = new Date().toISOString();

    try {
      const reclaimedCount = await redis.eval(
        RECLAIM_EXPIRED_JOBS_LUA,
        3,
        processingKey,
        queueKey,
        dlqKey,
        now,
        50,
        nowIso
      );

      if (reclaimedCount > 0) {
        logger.warn(
          `Reclaimed ${reclaimedCount} abandoned or expired jobs on queue [${queueName}]`
        );
      }
    } catch (err) {
      logger.error(`Error reclaiming abandoned jobs on [${queueName}]: ${err.message}`);
    }
  }

  /**
   * Renew the visibility lease for an in-flight job.
   * @param {string} queueName
   * @param {string} jobId
   * @param {string} claimToken
   * @returns {Promise<number>} 1 if renewed, 0 if claim lost
   */
  async renewLease(queueName, jobId, claimToken) {
    const processingKey = `iam:queue:${queueName}:processing`;
    const newExpiresAt = Date.now() + this.visibilityTimeoutMs;

    try {
      return await redis.eval(RENEW_LEASE_LUA, 1, processingKey, jobId, claimToken, newExpiresAt);
    } catch (err) {
      logger.error(`Error renewing lease for job [${jobId}] on [${queueName}]: ${err.message}`);
      return -1; // transient failure: ownership is unknown, keep renewing
    }
  }

  /**
   * Atomically finalize and mark job as completed.
   * @param {string} queueName
   * @param {string} jobId
   * @param {string} claimToken
   * @param {Object} [result]
   * @returns {Promise<number>} 1 if completed, 0 if ownership lost
   */
  async completeJob(queueName, jobId, claimToken, result = null) {
    const processingKey = `iam:queue:${queueName}:processing`;
    const nowIso = new Date().toISOString();
    const resultJson = result !== null && result !== undefined ? JSON.stringify(result) : '';

    return await redis.eval(
      COMPLETE_JOB_LUA,
      1,
      processingKey,
      jobId,
      claimToken,
      nowIso,
      resultJson
    );
  }

  /**
   * Atomically mark job as delayed for exponential backoff retry.
   * @param {string} queueName
   * @param {string} jobId
   * @param {string} claimToken
   * @param {string} errorMessage
   * @param {number} delayMs
   * @returns {Promise<number>}
   */
  async delayRetryJob(queueName, jobId, claimToken, errorMessage, delayMs) {
    const processingKey = `iam:queue:${queueName}:processing`;
    const delayedKey = `iam:queue:${queueName}:delayed`;
    const executeAtMs = Date.now() + delayMs;
    const retryAtIso = new Date(executeAtMs).toISOString();
    const nowIso = new Date().toISOString();

    return await redis.eval(
      DELAY_RETRY_JOB_LUA,
      2,
      processingKey,
      delayedKey,
      jobId,
      claimToken,
      errorMessage,
      retryAtIso,
      nowIso,
      executeAtMs
    );
  }

  /**
   * Atomically transition failed job to DLQ.
   * @param {string} queueName
   * @param {string} jobId
   * @param {string} claimToken
   * @param {string} errorMessage
   * @returns {Promise<number>}
   */
  async moveToDlq(queueName, jobId, claimToken, errorMessage) {
    const processingKey = `iam:queue:${queueName}:processing`;
    const dlqKey = `iam:queue:${queueName}:dlq`;
    const nowIso = new Date().toISOString();

    return await redis.eval(
      DLQ_JOB_LUA,
      2,
      processingKey,
      dlqKey,
      jobId,
      claimToken,
      errorMessage,
      nowIso
    );
  }

  /**
   * Drain available jobs in the queue sequentially.
   * Strictly atomic pop and visibility lease claim: no non-atomic fallback!
   * @param {string} queueName
   */
  async processNext(queueName) {
    if (this.isProcessing.get(queueName)) {
      return;
    }

    const handler = this.workers.get(queueName);
    if (!handler) {
      return;
    }

    this.isProcessing.set(queueName, true);

    try {
      // Migrate any ready delayed jobs before checking active queue
      await this.migrateDelayedJobs(queueName);

      const queueKey = `iam:queue:${queueName}`;
      const processingKey = `iam:queue:${queueName}:processing`;

      while (true) {
        const leaseExpiresAt = Date.now() + this.visibilityTimeoutMs;
        const claimToken = generateRandomToken(16);
        const nowIso = new Date().toISOString();

        // Strictly atomic claim: pop from queue and register lease in processing ZSET
        // If atomic EVAL fails, do NOT fallback to non-atomic RPOP/ZADD — log error and exit loop safely
        let claimResult;
        try {
          claimResult = await redis.eval(
            POP_AND_CLAIM_LUA,
            2,
            queueKey,
            processingKey,
            leaseExpiresAt,
            claimToken,
            nowIso
          );
        } catch (evalErr) {
          logger.error(`Atomic claim failed for queue [${queueName}]: ${evalErr.message}`);
          break;
        }

        if (!claimResult || !claimResult[0]) {
          break; // Queue is empty
        }

        const [jobId, jobDataStr] = claimResult;
        if (!jobDataStr) {
          // Missing metadata; cleanup from processing
          await redis.zrem(processingKey, jobId).catch(() => {});
          continue;
        }

        let job;
        try {
          job = JSON.parse(jobDataStr);
        } catch {
          await redis.zrem(processingKey, jobId).catch(() => {});
          continue;
        }

        // Idempotency: skip if already completed
        if (job.status === 'completed') {
          await redis.zrem(processingKey, jobId).catch(() => {});
          continue;
        }

        // Setup active lease renewal heartbeat (every 20s for 60s lease)
        const renewalIntervalMs = Math.max(5000, Math.floor(this.visibilityTimeoutMs / 3));
        let leaseLost = false;
        const heartbeat = setInterval(async () => {
          try {
            const renewed = await this.renewLease(queueName, jobId, claimToken);
            if (renewed === 0) {
              leaseLost = true;
              logger.warn(`Visibility lease lost for job [${jobId}] on queue [${queueName}]`);
              clearInterval(heartbeat);
            }
          } catch (err) {
            logger.error(`Failed to renew visibility lease for job [${jobId}]: ${err.message}`);
          }
        }, renewalIntervalMs);

        if (typeof heartbeat.unref === 'function') {
          heartbeat.unref();
        }

        try {
          // Execute worker handler with job metadata and claimToken
          const result = await handler(job.payload, {
            ...job,
            claimToken,
            isLeaseLost: () => leaseLost,
          });

          // Check lease ownership before finalization
          if (leaseLost) {
            logger.warn(
              `Job [${jobId}] completed but lease was previously lost; skipping finalization`
            );
          } else {
            try {
              const finalized = await this.completeJob(queueName, jobId, claimToken, result);
              if (finalized !== 1) {
                logger.warn(
                  `Job [${jobId}] completion rejected by Redis: claimToken ownership lost`
                );
              }
            } catch (finalizeErr) {
              logger.error(
                `Job [${jobId}] handler succeeded but finalization failed: ${finalizeErr.message}`
              );
            }
          }
        } catch (handlerErr) {
          logger.warn(
            `Job [${jobId}] on queue [${queueName}] attempt ${job.attempts}/${job.maxAttempts} failed: ${handlerErr.message}`
          );

          if (job.attempts < job.maxAttempts) {
            // Exponential backoff: attempt 1: 2s, attempt 2: 4s, attempt 3: 8s (max 60s)
            const delayMs = Math.min(1000 * Math.pow(2, job.attempts), 60000);
            await this.delayRetryJob(queueName, jobId, claimToken, handlerErr.message, delayMs);
            logger.info(
              `Job [${jobId}] scheduled for retry in ${delayMs}ms (attempt ${job.attempts + 1}/${job.maxAttempts})`
            );
          } else {
            // Max attempts reached — atomically move to Dead Letter Queue (DLQ)
            await this.moveToDlq(queueName, jobId, claimToken, handlerErr.message);
            logger.error(
              `Job [${jobId}] moved to DLQ after ${job.attempts} attempts on [${queueName}]: ${handlerErr.message}`
            );
          }
        } finally {
          clearInterval(heartbeat);
        }
      }
    } finally {
      this.isProcessing.set(queueName, false);
    }
  }

  /**
   * Stop polling intervals.
   */
  stopAll() {
    for (const interval of this.pollIntervals.values()) {
      clearInterval(interval);
    }
    this.pollIntervals.clear();
  }
}

module.exports = new QueueService();
