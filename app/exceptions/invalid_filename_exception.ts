import { Exception } from '@adonisjs/core/exceptions'

export default class InvalidFilenameException extends Exception {
  static status = 400
  static code = 'E_INVALID_FILENAME'
  static message = 'Invalid filename'
  static name = 'E_INVALID_FILENAME'
}
