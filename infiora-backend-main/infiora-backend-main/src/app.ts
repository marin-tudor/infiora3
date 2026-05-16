import express, { Express } from 'express';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import cors from 'cors';
import passport from 'passport';
import httpStatus from 'http-status';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import config from './config/config';
import { morgan } from './modules/logger';
import { jwtStrategy } from './modules/auth';
import { authLimiter } from './modules/utils';
import mongoSanitize from './modules/utils/mongoSanitize';
import { ApiError, errorConverter, errorHandler } from './modules/errors';
import routes from './routes/v1';

const app: Express = express();
const unsafeMethods = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const localUploadsEnabled = config.env !== 'production' && process.env['ENABLE_LOCAL_UPLOADS'] !== 'false';

app.set('trust proxy', config.trustProxy);

if (config.env !== 'test') {
  app.use(morgan.successHandler);
  app.use(morgan.errorHandler);
}

// set security HTTP headers
app.use(helmet());

// enable cors
const isAllowedOrigin = (origin: string | undefined): boolean => {
  if (!origin) return true;
  if (config.allowedOrigins.includes(origin)) return true;
  if (config.env !== 'production') {
    try {
      const parsedOrigin = new URL(origin);
      const isHttp = parsedOrigin.protocol === 'http:' || parsedOrigin.protocol === 'https:';
      const isLocalhost = parsedOrigin.hostname === 'localhost' || parsedOrigin.hostname.endsWith('.localhost');
      if (isHttp && isLocalhost) return true;
    } catch {
      return false;
    }
  }
  return false;
};

const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    if (isAllowedOrigin(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
};

app.use(cors(corsOptions));
app.options('/{*any}', cors(corsOptions));

// Stripe webhooks must receive the raw request body for signature verification.
app.use('/v1/stripe/webhook', express.raw({ type: 'application/json' }));

// parse json request body
app.use(express.json({ limit: '10mb' }));

// Parse cookies
app.use(cookieParser(config.cookieSecret));

// parse urlencoded request body
app.use(express.urlencoded({ extended: true }));

// sanitize request data
app.use(mongoSanitize);

// gzip compression
app.use(compression());

app.use((req, _res, next) => {
  if (!unsafeMethods.has(req.method)) {
    return next();
  }

  const hasAuthCookies = Boolean((req.signedCookies as any)?.accessToken || (req.signedCookies as any)?.refreshToken);

  if (!hasAuthCookies) {
    return next();
  }

  const origin = req.get('origin');
  const secFetchSite = req.get('sec-fetch-site');

  if (secFetchSite === 'cross-site') {
    return next(new ApiError(httpStatus.FORBIDDEN, 'Cross-site authenticated requests are not allowed.'));
  }

  if (origin && !isAllowedOrigin(origin)) {
    return next(new ApiError(httpStatus.FORBIDDEN, 'Request origin is not allowed.'));
  }

  const csrfCookie = req.cookies?.csrfToken;
  const csrfHeader = req.get('x-csrf-token');

  const csrfCookieBuffer = csrfCookie ? Buffer.from(csrfCookie) : null;
  const csrfHeaderBuffer = csrfHeader ? Buffer.from(csrfHeader) : null;

  if (
    !csrfCookieBuffer ||
    !csrfHeaderBuffer ||
    csrfCookieBuffer.length !== csrfHeaderBuffer.length ||
    !crypto.timingSafeEqual(csrfCookieBuffer, csrfHeaderBuffer)
  ) {
    return next(new ApiError(httpStatus.FORBIDDEN, 'Invalid CSRF token.'));
  }

  return next();
});

// jwt authentication
app.use(passport.initialize());
passport.use('jwt', jwtStrategy);

// limit repeated failed requests to auth endpoints
if (config.env === 'production') {
  app.use('/v1/auth', authLimiter);
  app.use('/v1/hotels/:hotelId/staff/verify-pin', authLimiter);
}

// v1 api routes
app.use('/v1', routes);

app.get('/v1/uploads/*relativePath', async (req, res, next) => {
  try {
    if (!localUploadsEnabled) {
      throw new ApiError(httpStatus.NOT_FOUND, 'File not found');
    }

    const rawRelativePath = (req.params as Record<string, string | string[]>)['relativePath'];
    const relativePath = Array.isArray(rawRelativePath) ? rawRelativePath.join(path.sep) : rawRelativePath;

    if (!relativePath) {
      throw new ApiError(httpStatus.NOT_FOUND, 'File not found');
    }

    const uploadRoot = path.resolve(process.cwd(), 'uploads');
    const targetPath = path.resolve(uploadRoot, relativePath);

    if (!targetPath.startsWith(uploadRoot)) {
      throw new ApiError(httpStatus.FORBIDDEN, 'Invalid upload path');
    }

    const ext = path.extname(targetPath).toLowerCase();
    const contentTypes: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.webp': 'image/webp',
      '.gif': 'image/gif',
      '.avif': 'image/avif',
      '.heic': 'image/heic',
      '.heif': 'image/heif',
    };

    const contentType = contentTypes[ext];

    // eslint-disable-next-line security/detect-non-literal-fs-filename
    if (!contentType || !fs.existsSync(targetPath)) {
      throw new ApiError(httpStatus.NOT_FOUND, 'File not found');
    }

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'private, max-age=300');
    res.sendFile(targetPath);
  } catch (error) {
    next(error);
  }
});

// send back a 404 error for any unknown api request
app.use((_req, _res, next) => {
  next(new ApiError(httpStatus.NOT_FOUND, 'Not found'));
});

// convert error to ApiError, if needed
app.use(errorConverter);

// handle error
app.use(errorHandler);

export default app;
