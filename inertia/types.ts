export type CameraForList = {
  id: number
  name: string
  link: string
  resolution: string
  organizationId: number
  userId: number
  label: string
  createdAt: Date
  updatedAt: Date | null
}

export type CameraForItem = CameraForList & {
  dailies: Array<{
    id: number
    cameraId: number
    label: string
    date: string
    path: string
    convertHlsToMp4JobId: string
    convertHlsToMp4JobStatus: string
    mp4Path: string
    convertHlsToMp4LastChunk: string
    createdAt: Date
    updatedAt: Date | null
  }>
}

export type UserForList = {
  id: number
  email: string
  organizationId: number
  isManager: boolean
  language: string
  theme: string
  permissions: Array<{
    id: number
    userId: number
    permissionId: number
    permission: {
      id: number
      name: string
    }
  }>
  cameraPermissions: Array<{
    id: number
    userId: number
    cameraId: number
    permissionId: number
    permission: {
      id: number
      name: string
    }
    camera: CameraForList
  }>
}
