import { Exception } from '@adonisjs/core/exceptions'

export default class FailedReadFileException extends Exception {
  static status = 500
  static code = 'E_FAILED_READ_FILE'
  static name = 'E_FAILED_READ_FILE'
  static message = 'Failed to read file'
}
