import logger from '@adonisjs/core/services/logger'

import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

/**
 * Middleware to log HTTP requests and responses
 *
 * Logs incoming requests with method, URL, and optionally body
 * Logs outgoing responses with status code and duration
 *
 * To log request bodies, uncomment the code in the handle() method
 * and add the sanitizeBody() helper function from docs/HTTP_LOGGING.md
 */
export default class HttpLoggerMiddleware {
  async handle({ request, response }: HttpContext, next: NextFn) {
    const startTime = Date.now()

    // Log incoming request
    const requestLog: any = {
      method: request.method(),
      url: request.url(true),
      ip: request.ip(),
      userAgent: request.header('user-agent'),
      requestId: request.id(),
    }

    logger.info(requestLog, '→ Incoming request')

    // Continue to next middleware/handler
    await next()

    // Log outgoing response
    const duration = Date.now() - startTime
    const responseLog = {
      method: request.method(),
      url: request.url(true),
      statusCode: response.getStatus(),
      duration: `${duration}ms`,
      requestId: request.id(),
      content: {} as any,
    }

    // Log based on status code
    if (response.getStatus() >= 500) {
      logger.error(responseLog, '← Response (Server Error)')
      responseLog.content = response.hasContent ? response.content : {}
    } else if (response.getStatus() >= 400) {
      logger.warn(responseLog, '← Response (Client Error)')
      responseLog.content = response.hasContent ? response.content : {}
    } else {
      logger.info(responseLog, '← Response')
    }
  }
}
