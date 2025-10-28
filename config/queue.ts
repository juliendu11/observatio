import env from '#start/env'
import { defineConfig } from '@acidiney/bull-queue'

export default defineConfig({
  uiPath: '/admin',

  connection: {
    host: env.get('REDIS_HOST'),
    port: env.get('REDIS_PORT'),
    password: env.get('REDIS_PASSWORD'),
    /*
    |--------------------------------------------------------------------------
    | BullMQ required settings
    |--------------------------------------------------------------------------
    |
    | maxRetriesPerRequest: null and enableReadyCheck: false are mandatory for
    | BullMQ to function correctly with ioredis.
    |
    | @see https://docs.bullmq.io/guide/connections
    |
    */
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    lazyConnect: true,
  },

  queue: {
    defaultJobOptions: {
      /*
      |--------------------------------------------------------------------------
      | Exponential Backoff on Retry
      |--------------------------------------------------------------------------
      |
      | Failed jobs are retried with an exponential delay: 10s → 20s → 40s.
      | This avoids hammering a resource that is temporarily unavailable.
      |
      */
      backoff: {
        type: 'exponential',
        delay: 10_000,
      },
    },
  },

  worker: {
    /*
    |--------------------------------------------------------------------------
    | Concurrency
    |--------------------------------------------------------------------------
    |
    | HLS→MP4 conversion relies on ffmpeg and is CPU/IO intensive.
    | Running too many conversions in parallel degrades throughput and risks
    | OOM. Keep concurrency low and tune up once you have metrics.
    |
    */
    concurrency: 2,

    /*
    |--------------------------------------------------------------------------
    | Lock Duration
    |--------------------------------------------------------------------------
    |
    | A full-day recording can take several minutes to convert. The lock must
    | outlive the longest expected job. Set to 30 minutes; BullMQ renews the
    | lock every lockRenewTime (lockDuration / 2) while the job is running.
    |
    */
    lockDuration: 30 * 60 * 1000,

    /*
    |--------------------------------------------------------------------------
    | Stalled Job Detection
    |--------------------------------------------------------------------------
    |
    | Jobs are considered stalled when the worker process crashes without
    | completing them. stalledInterval controls how often the scheduler checks;
    | maxStalledCount limits how many times a job can be requeued as stalled
    | before being marked failed.
    |
    */
    stalledInterval: 60 * 1000,
    maxStalledCount: 1,
  },

  jobs: {
    /*
    |--------------------------------------------------------------------------
    | Default Job Attempts
    |--------------------------------------------------------------------------
    */
    attempts: 3,

    /*
    |--------------------------------------------------------------------------
    | Auto-Removal of Jobs
    |--------------------------------------------------------------------------
    |
    | Keep more failures than completions: completed jobs are informational,
    | failed jobs are needed for debugging and alerting.
    |
    */
    removeOnComplete: 50,
    removeOnFail: 500,
  },

  queueNames: ['default'],
  queuePrefix: '@bull-',
})
