/**
 * Tenant-isolation tests: an authenticated user from Hotel A must not be able to
 * create resources (rooms, groups, links) that belong to Hotel B.
 *
 * The enforcement is done by isBodyHotelOwner / isBodyRoomOrGroupOwner middlewares
 * which look up the hotel from req.body and verify that req.user owns it.
 */

import mongoose from 'mongoose';
import moment from 'moment';
import request from 'supertest';
import httpStatus from 'http-status';
import app from '../../../app';
import setupTestDB from '../../jest/setupTestDB';
import Hotel from '../../hotel/hotel.model';
import Room from '../room.model';
import User from '../../user/user.model';
import * as tokenService from '../../token/token.service';
import tokenTypes from '../../token/token.types';
import config from '../../../config/config';

setupTestDB();

const makeAccessToken = (userId: mongoose.Types.ObjectId) => {
  const expires = moment().add(config.jwt.accessExpirationMinutes, 'minutes');
  return tokenService.generateToken(userId, expires, tokenTypes.ACCESS);
};

const createUser = async (label: string) => {
  return User.create({
    name: `User ${label}`,
    email: `user-${label}-${new mongoose.Types.ObjectId()}@example.com`,
    password: 'password1',
    role: 'user',
    isEmailVerified: true,
  });
};

const createHotel = async (userId: mongoose.Types.ObjectId, name: string) => {
  return Hotel.create({ user: userId, name });
};

describe('Tenant isolation — cross-hotel resource creation', () => {
  let userAToken: string;
  let hotelAId: string;
  let hotelBId: string;

  beforeEach(async () => {
    const userA = await createUser('A');
    const userB = await createUser('B');
    const hotelA = await createHotel(userA._id, 'Hotel A');
    const hotelB = await createHotel(userB._id, 'Hotel B');
    userAToken = makeAccessToken(userA._id);
    hotelAId = String(hotelA._id);
    hotelBId = String(hotelB._id);
  });

  describe('POST /v1/rooms — cross-hotel room creation', () => {
    it('should return 403 when userA tries to create a room for hotelB', async () => {
      await request(app)
        .post('/v1/rooms')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({ hotel: hotelBId, quantity: 1 })
        .expect(httpStatus.FORBIDDEN);
    });

    it('should return 201 when userA creates a room for their own hotel', async () => {
      await request(app)
        .post('/v1/rooms')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({ hotel: hotelAId, quantity: 1 })
        .expect(httpStatus.CREATED);
    });
  });

  describe('POST /v1/groups — cross-hotel group creation', () => {
    it('should return 403 when userA tries to create a group for hotelB', async () => {
      await request(app)
        .post('/v1/groups')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({ hotel: hotelBId, title: 'Infiltrated Group' })
        .expect(httpStatus.FORBIDDEN);
    });

    it('should return 201 when userA creates a group for their own hotel', async () => {
      await request(app)
        .post('/v1/groups')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({ hotel: hotelAId, title: 'Legit Group' })
        .expect(httpStatus.CREATED);
    });
  });

  describe('POST /v1/links — cross-hotel link creation via room', () => {
    it('should return 403 when userA tries to create a link for a room in hotelB', async () => {
      const roomB = await Room.create({ hotel: hotelBId, number: '200' });
      await request(app)
        .post('/v1/links')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({ room: String(roomB._id), title: 'Stolen Link', type: 'link', value: 'https://evil.com' })
        .expect(httpStatus.FORBIDDEN);
    });

    it('should return 201 when userA creates a link for a room in their own hotel', async () => {
      const roomA = await Room.create({ hotel: hotelAId, number: '101' });
      await request(app)
        .post('/v1/links')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({ room: String(roomA._id), title: 'Legit Link', type: 'link', value: 'https://wifi.hotel.com' })
        .expect(httpStatus.CREATED);
    });
  });

  describe('Unauthenticated requests', () => {
    it('should return 401 when no token is provided for POST /v1/rooms', async () => {
      await request(app)
        .post('/v1/rooms')
        .send({ hotel: hotelBId, quantity: 1 })
        .expect(httpStatus.UNAUTHORIZED);
    });

    it('should return 401 when no token is provided for POST /v1/groups', async () => {
      await request(app)
        .post('/v1/groups')
        .send({ hotel: hotelBId })
        .expect(httpStatus.UNAUTHORIZED);
    });
  });
});
