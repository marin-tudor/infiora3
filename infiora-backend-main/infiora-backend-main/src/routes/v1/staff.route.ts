import express, { Router } from 'express';
import { validate } from '../../modules/validate';
import { auth } from '../../modules/auth';
import { isHotelOwner } from '../../modules/middleware';
import * as staffController from '../../modules/staff/staff.controller';
import staffValidation from '../../modules/staff/staff.validation';

const router: Router = express.Router();

// PIN verify — no user auth needed; hotel scoped via :hotelId param
router.post('/hotels/:hotelId/staff/verify-pin', validate(staffValidation.verifyPin), staffController.verifyPin);

// Global role templates (no hotel scope)
router.get('/staff/roles/templates', auth(), staffController.getTemplates);

// Roles
router.get('/hotels/:hotelId/staff/roles', auth(), isHotelOwner, staffController.getRoles);
router.post(
  '/hotels/:hotelId/staff/roles',
  auth(),
  isHotelOwner,
  validate(staffValidation.createRole),
  staffController.createRole
);
router.patch(
  '/hotels/:hotelId/staff/roles/:roleId',
  auth(),
  isHotelOwner,
  validate(staffValidation.updateRole),
  staffController.updateRole
);
router.delete('/hotels/:hotelId/staff/roles/:roleId', auth(), isHotelOwner, staffController.deleteRole);

// Members
router.get('/hotels/:hotelId/staff/members', auth(), isHotelOwner, staffController.getMembers);
router.post(
  '/hotels/:hotelId/staff/members',
  auth(),
  isHotelOwner,
  validate(staffValidation.createMember),
  staffController.createMember
);
router.patch(
  '/hotels/:hotelId/staff/members/:memberId',
  auth(),
  isHotelOwner,
  validate(staffValidation.updateMember),
  staffController.updateMember
);
router.delete('/hotels/:hotelId/staff/members/:memberId', auth(), isHotelOwner, staffController.deleteMember);

export default router;
