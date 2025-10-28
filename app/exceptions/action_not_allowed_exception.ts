import { Exception } from '@adonisjs/core/exceptions'

export default class ActionNotAllowedException extends Exception {
  static status = 401
  static code = 'E_ACTION_NOT_ALLOWED'
  static message = 'You are not allowed to perform this action.'
  static name = 'E_ACTION_NOT_ALLOWED'
}
