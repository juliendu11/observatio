import transmit from '@adonisjs/transmit/services/main'
import { SystemMetrics } from '#services/system_metrics_service'
import { SystemLog } from '#services/system_logs_service'
import CameraDaily from '#models/camera_daily'

export default class SSEService {
  emitConvertHlsToMp4Status(cameraDaily: CameraDaily) {
    transmit.broadcast(`cameras/${cameraDaily.cameraId}/convert`, cameraDaily as any)
  }

  emitSystemMetrics(metrics: SystemMetrics) {
    transmit.broadcast('system/metrics', metrics as any)
  }

  emitLogMessage(log: SystemLog) {
    transmit.broadcast('system/log', log as any)
  }
}
