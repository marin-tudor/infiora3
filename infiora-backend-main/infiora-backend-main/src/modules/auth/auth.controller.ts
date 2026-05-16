import httpStatus from 'http-status';
import { Request, Response } from 'express';
import crypto from 'crypto';
import catchAsync from '../utils/catchAsync';
import { tokenService } from '../token';
import { userService } from '../user';
import * as authService from './auth.service';
import { emailService } from '../email';
import config from '../../config/config';
import ApiError from '../errors/ApiError';

const issueAuthCookies = (res: Response, tokens: Awaited<ReturnType<typeof tokenService.generateAuthTokens>>) => {
  res.cookie('accessToken', tokens.access.token, config.jwt.accessCookieOptions);
  res.cookie('refreshToken', tokens.refresh.token, config.jwt.refreshCookieOptions);
  res.cookie('csrfToken', crypto.randomBytes(24).toString('hex'), config.jwt.csrfCookieOptions);
};

const clearAuthCookies = (res: Response) => {
  res.clearCookie('accessToken', config.jwt.cookieOptions);
  res.clearCookie('refreshToken', config.jwt.cookieOptions);
  res.clearCookie('csrfToken', config.jwt.csrfCookieOptions);
};

const resolveRefreshToken = (req: Request): string => {
  const cookieToken = (req.signedCookies as any).refreshToken;
  const bodyToken = req.body?.refreshToken;
  const refreshToken = cookieToken || bodyToken;

  if (!refreshToken) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Refresh token is required');
  }

  return refreshToken;
};

export const register = catchAsync(async (req: Request, res: Response) => {
  const user = await userService.createUser(req.body);
  const tokens = await tokenService.generateAuthTokens(user);
  issueAuthCookies(res, tokens);
  res.status(httpStatus.CREATED).send({ user, tokens });
});

export const login = catchAsync(async (req: Request, res: Response) => {
  const { email, password } = req.body;
  const user = await authService.loginUserWithEmailAndPassword(email, password);
  const tokens = await tokenService.generateAuthTokens(user);
  issueAuthCookies(res, tokens);
  res.send({ user, tokens });
});

export const logout = catchAsync(async (req: Request, res: Response) => {
  await authService.logout(resolveRefreshToken(req));
  clearAuthCookies(res);
  res.status(httpStatus.NO_CONTENT).send();
});

export const refreshTokens = catchAsync(async (req: Request, res: Response) => {
  const { user, tokens } = await authService.refreshAuth(resolveRefreshToken(req));
  issueAuthCookies(res, tokens);
  res.send({ user, tokens });
});

export const forgotPassword = catchAsync(async (req: Request, res: Response) => {
  const resetPasswordToken = await tokenService.generateResetPasswordToken(req.body.email);
  await emailService.sendResetPasswordEmail(req.body.email, resetPasswordToken);
  res.status(httpStatus.NO_CONTENT).send();
});

export const resetPassword = catchAsync(async (req: Request, res: Response) => {
  await authService.resetPassword(req.query['token'], req.body.password);
  res.status(httpStatus.NO_CONTENT).send();
});

export const sendVerificationEmail = catchAsync(async (req: Request, res: Response) => {
  const verifyEmailToken = await tokenService.generateVerifyEmailToken(req.user);
  await emailService.sendVerificationEmail(req.user.email, verifyEmailToken, req.user.name);
  res.status(httpStatus.NO_CONTENT).send();
});

export const verifyEmail = catchAsync(async (req: Request, res: Response) => {
  await authService.verifyEmail(req.query['token']);
  res.status(httpStatus.NO_CONTENT).send();
});
