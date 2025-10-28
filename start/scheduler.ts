import queue from '@acidiney/bull-queue/services/main'
import CheckDiskSpace from '#jobs/check_disk_space'

// Registers the dispatcher as a repeatable cron job (every minute).
// BullMQ is idempotent: calling this multiple times with the same pattern does not duplicate the job.
await queue.dispatch(
  CheckDiskSpace.name,
  {},
  {
    repeat: { pattern: '0 */2 * * *' },
    attempts: 1,
  }
)

await queue.dispatch(
  CheckDiskSpace.name,
  {},
  {
    attempts: 1,
  }
)
