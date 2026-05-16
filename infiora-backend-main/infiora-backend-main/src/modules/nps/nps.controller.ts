import { Request, Response } from 'express';
import catchAsync from '../utils/catchAsync';
import { saveRating } from './nps.service';

const redirectBase = (): string => (process.env['GUEST_APP_URL'] || '').replace(/\/$/, '');

export const submitFeedback = catchAsync(async (req: Request, res: Response) => {
  const token = req.params['token'] as string;
  const rating = req.params['rating'] as string;
  const comment = req.query['comment'] as string | undefined;
  const numericRating = Number(rating);

  if (!token || !Number.isInteger(numericRating) || numericRating < 1 || numericRating > 5) {
    res.status(400).json({ message: 'Invalid feedback link' });
    return;
  }

  const direction = await saveRating({
    rating: numericRating,
    token,
    ...(comment ? { comment } : {}),
  });

  const guestApp = redirectBase();
  if (direction === 'positive') {
    res.redirect(`${guestApp}/feedback/thank-you?googleReview=1`);
    return;
  }

  if (comment) {
    res.redirect(`${guestApp}/feedback/thank-you`);
    return;
  }

  res.redirect(`${guestApp}/feedback/form/${encodeURIComponent(token)}/${numericRating}`);
});
