/**
 * Public room endpoint must not leak sensitive hotel fields to unauthenticated callers.
 *
 * The controller calls roomService.getPublicRoom() when the requester has no auth,
 * which in turn calls getGuestHotelSummary() — a whitelist projection that only
 * exposes safe hotel fields.  These tests assert that the raw sensitive fields are
 * absent from the serialised response body.
 */

import mongoose from 'mongoose';
import request from 'supertest';
import httpStatus from 'http-status';
import app from '../../../app';
import setupTestDB from '../../jest/setupTestDB';
import Hotel from '../../hotel/hotel.model';
import Room from '../room.model';
import User from '../../user/user.model';

jest.mock('node-ical', () => ({
  async: {
    parseICS: jest.fn(),
    fromURL: jest.fn(),
  },
}));

setupTestDB();

const createOwner = async () => {
  const user = await User.create({
    name: 'Owner',
    email: `owner-${Date.now()}@example.com`,
    password: 'password1',
    role: 'user',
    isEmailVerified: true,
  });
  return user;
};

const createHotelWithSensitiveFields = async (userId: mongoose.Types.ObjectId) => {
  const hotel = await Hotel.create({
    user: userId,
    name: 'Test Hotel',
    stripeAccountId: 'acct_test_supersecret',
    stripeAccountStatus: 'active',
    stripePlatformFeePercent: 15,
    orders: {
      enabled: true,
      tablePin: 'SECRET_PIN_9999',
      emails: ['manager@hotel.com'],
    },
    settings: {
      security: {
        trustedDomains: ['internal.hotel.com'],
        deviceTokenVersion: 3,
        pinSessionHours: 4,
      },
    },
  });
  return hotel;
};

describe('GET /v1/rooms/:roomId — public access security', () => {
  let roomId: string;
  let hotelId: string;

  beforeEach(async () => {
    const owner = await createOwner();
    const hotel = await createHotelWithSensitiveFields(owner._id);
    const room = await Room.create({ hotel: hotel._id, number: '101' });
    roomId = String(room._id);
    hotelId = String(hotel._id);
  });

  it('should reject public room listings without explicit hotel scope', async () => {
    await request(app).get('/v1/rooms').expect(httpStatus.BAD_REQUEST);
  });

  it('should allow public room listings when hotel scope is provided', async () => {
    const res = await request(app).get(`/v1/rooms?hotel=${hotelId}`).expect(httpStatus.OK);
    expect(Array.isArray(res.body?.results)).toBe(true);
  });

  it('should return 200 for a valid room without auth', async () => {
    await request(app).get(`/v1/rooms/${roomId}`).expect(httpStatus.OK);
  });

  it('should not expose stripeAccountId in public response', async () => {
    const res = await request(app).get(`/v1/rooms/${roomId}`).expect(httpStatus.OK);
    expect(JSON.stringify(res.body)).not.toContain('stripeAccountId');
    expect(JSON.stringify(res.body)).not.toContain('acct_test_supersecret');
  });

  it('should not expose stripePlatformFeePercent in public response', async () => {
    const res = await request(app).get(`/v1/rooms/${roomId}`).expect(httpStatus.OK);
    expect(JSON.stringify(res.body)).not.toContain('stripePlatformFeePercent');
  });

  it('should not expose stripeAccountStatus in public response', async () => {
    const res = await request(app).get(`/v1/rooms/${roomId}`).expect(httpStatus.OK);
    expect(JSON.stringify(res.body)).not.toContain('stripeAccountStatus');
  });

  it('should not expose hotel ordering tablePin in public response', async () => {
    const res = await request(app).get(`/v1/rooms/${roomId}`).expect(httpStatus.OK);
    expect(JSON.stringify(res.body)).not.toContain('tablePin');
    expect(JSON.stringify(res.body)).not.toContain('SECRET_PIN_9999');
  });

  it('should not expose hotel.orders.emails in public response', async () => {
    const res = await request(app).get(`/v1/rooms/${roomId}`).expect(httpStatus.OK);
    expect(JSON.stringify(res.body)).not.toContain('manager@hotel.com');
  });

  it('should not expose hotel.user (owner ID) in public response', async () => {
    const res = await request(app).get(`/v1/rooms/${roomId}`).expect(httpStatus.OK);
    // The hotel object in the public payload must not include the raw user/manager ObjectId fields
    const hotelPayload = res.body?.hotel;
    expect(hotelPayload).toBeDefined();
    expect(hotelPayload).not.toHaveProperty('user');
    expect(hotelPayload).not.toHaveProperty('manager');
  });

  it('should not expose hotel security config in public response', async () => {
    const res = await request(app).get(`/v1/rooms/${roomId}`).expect(httpStatus.OK);
    expect(JSON.stringify(res.body)).not.toContain('trustedDomains');
    expect(JSON.stringify(res.body)).not.toContain('deviceTokenVersion');
    expect(JSON.stringify(res.body)).not.toContain('pinSessionHours');
    expect(JSON.stringify(res.body)).not.toContain('internal.hotel.com');
  });

  it('should include only safe hotel summary fields', async () => {
    const res = await request(app).get(`/v1/rooms/${roomId}`).expect(httpStatus.OK);
    const hotelPayload = res.body?.hotel;
    expect(hotelPayload).toBeDefined();
    expect(hotelPayload).toHaveProperty('id');
    expect(hotelPayload).toHaveProperty('name');
    // Orders present but only safe sub-fields (enabled, paymentMethods)
    expect(hotelPayload?.orders).toHaveProperty('enabled');
    expect(hotelPayload?.orders).toHaveProperty('paymentMethods');
  });
});
