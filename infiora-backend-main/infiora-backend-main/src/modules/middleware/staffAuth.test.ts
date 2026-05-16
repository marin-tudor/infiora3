import httpMocks from 'node-mocks-http';
import jwt from 'jsonwebtoken';
import httpStatus from 'http-status';
import { staffAuth } from './staffAuth';
import StaffMember from '../staff/staff-member.model';
import ApiError from '../errors/ApiError';

jest.mock('jsonwebtoken');
jest.mock('../staff/staff-member.model');

describe('staffAuth middleware', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  test('rejects stale sessions when staff member is no longer active', async () => {
    (jwt.verify as jest.Mock).mockReturnValue({
      type: 'staff-session',
      sub: 'staff-1',
      hotelId: 'hotel-1',
    });
    (StaffMember.findOne as any).mockReturnValue({
      populate: jest.fn().mockResolvedValue(null),
    });

    const req = httpMocks.createRequest({
      method: 'GET',
      headers: {
        authorization: 'Bearer token-1',
      },
      params: {
        hotelId: 'hotel-1',
      },
    });
    const res = httpMocks.createResponse();
    const next = jest.fn();

    await staffAuth('orders:view')(req as any, res as any, next);

    expect(next).toHaveBeenCalledWith(expect.any(ApiError));
    expect((next.mock.calls[0]?.[0] as ApiError).statusCode).toBe(httpStatus.UNAUTHORIZED);
  });

  test('uses current database permissions and group scope', async () => {
    (jwt.verify as jest.Mock).mockReturnValue({
      type: 'staff-session',
      sub: 'staff-1',
      hotelId: 'hotel-1',
      permissions: [],
      groupIds: [],
    });
    (StaffMember.findOne as any).mockReturnValue({
      populate: jest.fn().mockResolvedValue({
        groupIds: ['group-a'],
        roleId: {
          permissions: ['orders:view'],
        },
      }),
    });

    const req = httpMocks.createRequest({
      method: 'GET',
      headers: {
        authorization: 'Bearer token-1',
      },
      params: {
        hotelId: 'hotel-1',
      },
    });
    const res = httpMocks.createResponse();
    const next = jest.fn();

    await staffAuth('orders:view')(req as any, res as any, next);

    expect(req.staffSession).toEqual({
      staffMemberId: 'staff-1',
      hotelId: 'hotel-1',
      permissions: ['orders:view'],
      groupIds: ['group-a'],
    });
    expect(next).toHaveBeenCalledWith();
  });
});
