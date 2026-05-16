import { Request, Response, NextFunction } from 'express';

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const sanitizeObject = (input: Record<string, unknown>) => {
  Object.keys(input).forEach((key) => {
    if (key.startsWith('$') || key.includes('.')) {
      delete input[key];
      return;
    }

    const value = input[key];
    if (Array.isArray(value)) {
      value.forEach((item) => {
        if (isPlainObject(item)) {
          sanitizeObject(item);
        }
      });
      return;
    }

    if (isPlainObject(value)) {
      sanitizeObject(value);
    }
  });
};

const mongoSanitize = (req: Request, _res: Response, next: NextFunction) => {
  if (isPlainObject(req.body)) {
    sanitizeObject(req.body as Record<string, unknown>);
  }
  if (isPlainObject(req.query)) {
    sanitizeObject(req.query as Record<string, unknown>);
  }
  if (isPlainObject(req.params)) {
    sanitizeObject(req.params as Record<string, unknown>);
  }
  next();
};

export default mongoSanitize;
