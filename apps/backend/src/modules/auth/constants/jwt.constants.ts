export const JWT_CONSTANTS = {
  TOKEN_TYPE: 'Bearer',
  HEADER_KEY: 'Authorization',
  STRATEGY_NAME: 'jwt',
  IGNORE_EXPIRATION: false,
  REFRESH_TOKEN_COOKIE: 'refresh_token',
} as const;

export const JWT_CONFIG = {
  secret: process.env.JWT_SECRET,
  signOptions: {
    expiresIn: process.env.JWT_EXPIRATION || '1h',
    algorithm: 'HS256',
  },
} as const;

export const REFRESH_TOKEN_CONFIG = {
  secret: process.env.JWT_SECRET,
  signOptions: {
    expiresIn: process.env.REFRESH_TOKEN_EXPIRATION || '7d',
    algorithm: 'HS256',
  },
} as const;

export const JWT_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: true,
  path: '/',
} as const;
