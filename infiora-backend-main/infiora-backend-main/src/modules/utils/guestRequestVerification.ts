import mongoose from 'mongoose';
import ReservationCode from '../orders/reservation-code.model';

type ServiceSettings = {
  askReservationCode?: boolean;
};

const normalizeRoomNumber = (roomNumber?: string) => roomNumber?.trim().toUpperCase().replace(/\s+/g, '');

const normalizeReservationCode = (code?: string) => code?.trim().toUpperCase().replace(/\s/g, '');

export const getEffectiveServiceSettings = <T extends ServiceSettings>(
  roomSettings?: T | null,
  groupSettings?: T | null
): T => {
  if (groupSettings) {
    return groupSettings;
  }

  return (roomSettings || {}) as T;
};

export const checkReservationCodeStatus = async (hotelId: mongoose.Types.ObjectId | string, code?: string) => {
  const normalizedCode = normalizeReservationCode(code);
  if (!normalizedCode) return 'not_provided' as const;

  const now = new Date();
  // eslint-disable-next-line security/detect-non-literal-fs-filename
  const match = await ReservationCode.exists({
    hotelId,
    code: normalizedCode,
    active: true,
    checkIn: { $lte: now },
    checkOut: { $gte: now },
  });

  return match ? ('matched' as const) : ('unmatched' as const);
};

export const checkRoomNumberStatus = (expectedRoomNumber?: string, providedRoomNumber?: string) => {
  const normalizedExpected = normalizeRoomNumber(expectedRoomNumber);
  const normalizedProvided = normalizeRoomNumber(providedRoomNumber);

  if (!normalizedProvided) return 'not_provided' as const;
  if (!normalizedExpected) return 'unknown' as const;

  return normalizedExpected === normalizedProvided ? ('matched' as const) : ('unmatched' as const);
};

export const getProofStatus = ({
  reservationCodeStatus,
  roomNumberStatus,
}: {
  reservationCodeStatus: 'not_provided' | 'matched' | 'unmatched';
  roomNumberStatus: 'not_provided' | 'matched' | 'unmatched' | 'unknown';
}) => {
  if (reservationCodeStatus === 'matched' || roomNumberStatus === 'matched') {
    return 'matched' as const;
  }

  if (reservationCodeStatus === 'unmatched' || roomNumberStatus === 'unmatched') {
    return 'unmatched' as const;
  }

  if (reservationCodeStatus === 'not_provided' && roomNumberStatus === 'not_provided') {
    return 'not_provided' as const;
  }

  return 'unknown' as const;
};
