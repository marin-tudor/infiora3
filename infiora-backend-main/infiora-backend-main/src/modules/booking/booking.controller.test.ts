jest.mock('node-ical', () => ({
  async: { fromURL: jest.fn() },
}));

import httpMocks from 'node-mocks-http';
import httpStatus from 'http-status';
import { getGuestBookings } from './booking.controller';
import ApiError from '../errors/ApiError';
import Booking from './booking.model';
import Room from '../room/room.model';
import * as ordersService from '../orders/orders.service';

jest.mock('./booking.model');
jest.mock('../room/room.model');
jest.mock('../orders/orders.service');

describe('booking.controller getGuestBookings', () => {
  const mockedVerifyGuestStatusToken = ordersService.verifyGuestStatusToken as jest.MockedFunction<
    typeof ordersService.verifyGuestStatusToken
  >;

  beforeEach(() => {
    jest.resetAllMocks();
  });

  test('requires a guest status token', async () => {
    const req = httpMocks.createRequest({
      method: 'GET',
      params: {
        hotelId: 'hotel-1',
        roomId: 'room-1',
      },
    });
    const res = httpMocks.createResponse();
    const next = jest.fn();

    getGuestBookings(req as any, res as any, next);
    await new Promise(process.nextTick);

    expect(next).toHaveBeenCalledWith(expect.any(ApiError));
    expect((next.mock.calls[0]?.[0] as ApiError).statusCode).toBe(httpStatus.UNAUTHORIZED);
  });

  test('does not accept guest token from query string fallback', async () => {
    const req = httpMocks.createRequest({
      method: 'GET',
      params: {
        hotelId: 'hotel-1',
        roomId: 'room-1',
      },
      query: {
        token: 'query-token',
      },
    });
    const res = httpMocks.createResponse();
    const next = jest.fn();

    getGuestBookings(req as any, res as any, next);
    await new Promise(process.nextTick);

    expect(mockedVerifyGuestStatusToken).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(expect.any(ApiError));
    expect((next.mock.calls[0]?.[0] as ApiError).statusCode).toBe(httpStatus.UNAUTHORIZED);
  });

  test('filters guest bookings by token email and hotel scope', async () => {
    mockedVerifyGuestStatusToken.mockReturnValue({
      hotelId: 'hotel-1',
      email: 'guest@example.com',
    });

    (Room.findOne as any).mockReturnValue({
      select: jest.fn().mockResolvedValue({ _id: 'room-1' }),
    });

    const serializedBookings = [
      {
        _id: 'booking-1',
        bookingRef: 'BK-1',
        itemId: {
          _id: 'item-1',
          name: 'Spa',
          bookingConfig: { cancelPolicyHours: 24 },
        },
        startTime: '2026-05-20T10:00:00.000Z',
        endTime: '2026-05-20T11:00:00.000Z',
        partySize: 2,
        status: 'confirmed',
        payment: 'card',
        total: 120,
      },
    ];
    const sort = jest.fn().mockResolvedValue(serializedBookings);
    const populate = jest.fn().mockReturnValue({ sort });
    (Booking.find as any).mockReturnValue({ populate });

    const req = httpMocks.createRequest({
      method: 'GET',
      params: {
        hotelId: 'hotel-1',
        roomId: 'room-1',
      },
      headers: {
        'x-guest-status-token': 'token-1',
      },
    });
    const res = httpMocks.createResponse();
    const next = jest.fn();

    getGuestBookings(req as any, res as any, next);
    await new Promise(process.nextTick);

    expect(mockedVerifyGuestStatusToken).toHaveBeenCalledWith('token-1');
    expect(Booking.find).toHaveBeenCalledWith(
      expect.objectContaining({
        hotelId: 'hotel-1',
        roomId: 'room-1',
        guestEmail: 'guest@example.com',
      })
    );
    expect(res._getJSONData()).toEqual([
      expect.objectContaining({
        id: 'booking-1',
        bookingRef: 'BK-1',
        status: 'confirmed',
      }),
    ]);
    expect(next).not.toHaveBeenCalled();
  });

  test('rejects tokens from another hotel', async () => {
    mockedVerifyGuestStatusToken.mockReturnValue({
      hotelId: 'hotel-2',
      email: 'guest@example.com',
    });

    (Room.findOne as any).mockReturnValue({
      select: jest.fn().mockResolvedValue({ _id: 'room-1' }),
    });

    const req = httpMocks.createRequest({
      method: 'GET',
      params: {
        hotelId: 'hotel-1',
        roomId: 'room-1',
      },
      headers: {
        'x-guest-status-token': 'token-1',
      },
    });
    const res = httpMocks.createResponse();
    const next = jest.fn();

    getGuestBookings(req as any, res as any, next);
    await new Promise(process.nextTick);

    expect(next).toHaveBeenCalledWith(expect.any(ApiError));
    expect((next.mock.calls[0]?.[0] as ApiError).statusCode).toBe(httpStatus.FORBIDDEN);
  });
});
