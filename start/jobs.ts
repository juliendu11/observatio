import HlsToMp4Job from '#jobs/hls_to_mp4'
import CheckDiskSpace from '#jobs/check_disk_space'

const jobs: Record<string, Function> = {
  [HlsToMp4Job.name]: () => import('#jobs/hls_to_mp4'),
  [CheckDiskSpace.name]: () => import('#jobs/check_disk_space'),
}

export { jobs }
