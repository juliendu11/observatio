import { Exception } from '@adonisjs/core/exceptions'

export default class FailedListFilesException extends Exception {
  static status = 500
  static code = 'E_FAILED_LIST_FILES'
  static name = 'E_FAILED_LIST_FILES'
  static message = 'Failed to list files'
}
