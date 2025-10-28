const HlsToMp4JobStatuses = {
  PENDING: 'PENDING',
  DONE: 'DONE',
  ERROR: 'ERROR',
  STOPPED: 'STOPPED',
} as const

export { HlsToMp4JobStatuses }

export type HlsToMp4JobStatusesType = (typeof HlsToMp4JobStatuses)[keyof typeof HlsToMp4JobStatuses]
