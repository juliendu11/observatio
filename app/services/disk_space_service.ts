import checkDiskSpace from 'check-disk-space'

export default class DiskSpaceService {
  async getDiskSpace(diskPath: string): Promise<{
    free: number
    size: number
  }> {
    // @ts-ignore
    return await checkDiskSpace(diskPath)
  }
}
