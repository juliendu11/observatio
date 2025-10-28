import { Exception } from '@adonisjs/core/exceptions'

export default class AccessDeniedException extends Exception {
  static status = 403
  static code = 'E_ACCESS_DENIED'
  static message = 'Access denied'
  static name = 'E_ACCESS_DENIED'
}
