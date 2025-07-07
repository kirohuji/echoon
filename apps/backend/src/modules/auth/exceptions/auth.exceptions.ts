import { HttpStatus } from '@nestjs/common';
import { AuthException } from './auth.exception';
import { AUTH_ERROR_MESSAGES } from './auth-exception.constants';

export class InvalidCredentialsException extends AuthException {
  constructor(message = AUTH_ERROR_MESSAGES.INVALID_CREDENTIALS) {
    super(message, HttpStatus.UNAUTHORIZED, 'INVALID_CREDENTIALS');
  }
}

export class UserNotFoundException extends AuthException {
  constructor(message = AUTH_ERROR_MESSAGES.USER_NOT_FOUND) {
    super(message, HttpStatus.NOT_FOUND, 'USER_NOT_FOUND');
  }
}

export class UserAlreadyExistsException extends AuthException {
  constructor(message = AUTH_ERROR_MESSAGES.USER_ALREADY_EXISTS) {
    super(message, HttpStatus.CONFLICT, 'USER_ALREADY_EXISTS');
  }
}

export class InvalidVerificationCodeException extends AuthException {
  constructor(message = AUTH_ERROR_MESSAGES.INVALID_VERIFICATION_CODE) {
    super(message, HttpStatus.BAD_REQUEST, 'INVALID_VERIFICATION_CODE');
  }
}

export class VerificationCodeExpiredException extends AuthException {
  constructor(message = AUTH_ERROR_MESSAGES.VERIFICATION_CODE_EXPIRED) {
    super(message, HttpStatus.BAD_REQUEST, 'VERIFICATION_CODE_EXPIRED');
  }
}

export class TooManyVerificationAttemptsException extends AuthException {
  constructor(message = AUTH_ERROR_MESSAGES.TOO_MANY_VERIFICATION_ATTEMPTS) {
    super(
      message,
      HttpStatus.TOO_MANY_REQUESTS,
      'TOO_MANY_VERIFICATION_ATTEMPTS',
    );
  }
}

export class InvalidTokenException extends AuthException {
  constructor(message = AUTH_ERROR_MESSAGES.INVALID_TOKEN) {
    super(message, HttpStatus.UNAUTHORIZED, 'INVALID_TOKEN');
  }
}

export class TokenExpiredException extends AuthException {
  constructor(message = AUTH_ERROR_MESSAGES.TOKEN_EXPIRED) {
    super(message, HttpStatus.UNAUTHORIZED, 'TOKEN_EXPIRED');
  }
}

export class InsufficientPermissionsException extends AuthException {
  constructor(message = AUTH_ERROR_MESSAGES.INSUFFICIENT_PERMISSIONS) {
    super(message, HttpStatus.FORBIDDEN, 'INSUFFICIENT_PERMISSIONS');
  }
}

export class VerificationCodeSendFailedException extends AuthException {
  constructor(message = AUTH_ERROR_MESSAGES.VERIFICATION_CODE_SEND_FAILED) {
    super(message, HttpStatus.BAD_REQUEST, 'VERIFICATION_CODE_SEND_FAILED');
  }
}
