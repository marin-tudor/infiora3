import rateLimit from 'express-rate-limit';

type RateLimiterOptions = {
  windowMs: number;
  max: number;
  message?: string;
  skipSuccessfulRequests?: boolean;
};

export const createRateLimiter = ({
  windowMs,
  max,
  message = 'Too many requests. Please try again later.',
  skipSuccessfulRequests = false,
}: RateLimiterOptions) =>
  rateLimit({
    windowMs,
    max,
    message,
    skipSuccessfulRequests,
  });

const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 20,
  skipSuccessfulRequests: true,
});

export default authLimiter;
