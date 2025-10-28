import { Exception } from '@adonisjs/core/exceptions'

export default class FileNotFoundException extends Exception {
  static status = 404
  static code = 'E_FILE_NOT_FOUND'
  static name = 'E_FILE_NOT_FOUND'
  static message = 'File not found'
}
