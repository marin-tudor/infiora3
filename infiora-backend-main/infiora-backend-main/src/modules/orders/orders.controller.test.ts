import httpMocks from 'node-mocks-http';
import httpStatus from 'http-status';
import { trackOrder } from './orders.controller';
import ApiError from '../errors/ApiError';
import * as ordersService from './orders.service';

jest.mock('node-ical', () => ({
  async: { fromURL: jest.fn() },
}));

jest.mock('./orders.service');

describe('orders.controller trackOrder', () => {
  const mockedTrackOrderSecure = ordersService.trackOrderSecure as jest.MockedFunction<
    typeof ordersService.trackOrderSecure
  >;

  beforeEach(() => {
    jest.resetAllMocks();
  });

  test('requires tracking token header', async () => {
    const req = httpMocks.createRequest({
      method: 'GET',
      params: {
        orderId: 'ORDER-1',
      },
    });
    const res = httpMocks.createResponse();
    const next = jest.fn();

    trackOrder(req as any, res as any, next);
    await new Promise(process.nextTick);

    expect(mockedTrackOrderSecure).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(expect.any(ApiError));
    expect((next.mock.calls[0]?.[0] as ApiError).statusCode).toBe(httpStatus.UNAUTHORIZED);
  });

  test('reads tracking token from x-order-tracking-token header', async () => {
    mockedTrackOrderSecure.mockResolvedValue({
      _id: 'mongo-1',
      orderId: 'ORDER-1',
      roomId: 'room-1',
      roomNumber: '101',
      items: [],
      total: 42,
      payment: 'cash',
      status: 'Processing',
      createdAt: new Date('2026-05-16T10:00:00.000Z'),
    } as any);

    const req = httpMocks.createRequest({
      method: 'GET',
      params: {
        orderId: 'ORDER-1',
      },
      headers: {
        'x-order-tracking-token': 'track-token-1',
      },
    });
    const res = httpMocks.createResponse();
    const next = jest.fn();

    trackOrder(req as any, res as any, next);
    await new Promise(process.nextTick);

    expect(mockedTrackOrderSecure).toHaveBeenCalledWith('ORDER-1', 'track-token-1');
    expect(res._getData()).toEqual(
      expect.objectContaining({
        orderId: 'ORDER-1',
        status: 'Processing',
      })
    );
    expect(next).not.toHaveBeenCalled();
  });
});
