import express, { Router } from 'express';
import { auth } from '../../modules/auth';
import { isHotelOwner } from '../../modules/middleware';
import { validate } from '../../modules/validate';
import * as dispatchController from '../../modules/dispatch/dispatch.controller';
import dispatchValidation from '../../modules/dispatch/dispatch.validation';

const router: Router = express.Router();

router.get('/hotels/:hotelId/dispatch/groups', auth(), isHotelOwner, dispatchController.getGroups);
router.post(
  '/hotels/:hotelId/dispatch/groups',
  auth(),
  isHotelOwner,
  validate(dispatchValidation.createGroup),
  dispatchController.createGroup
);
router.patch(
  '/hotels/:hotelId/dispatch/groups/:groupId',
  auth(),
  isHotelOwner,
  validate(dispatchValidation.updateGroup),
  dispatchController.updateGroup
);
router.delete('/hotels/:hotelId/dispatch/groups/:groupId', auth(), isHotelOwner, dispatchController.deleteGroup);

router.get('/hotels/:hotelId/dispatch/rules', auth(), isHotelOwner, dispatchController.getRules);
router.post(
  '/hotels/:hotelId/dispatch/rules',
  auth(),
  isHotelOwner,
  validate(dispatchValidation.createRule),
  dispatchController.createRule
);
router.patch(
  '/hotels/:hotelId/dispatch/rules/:ruleId',
  auth(),
  isHotelOwner,
  validate(dispatchValidation.updateRule),
  dispatchController.updateRule
);
router.delete('/hotels/:hotelId/dispatch/rules/:ruleId', auth(), isHotelOwner, dispatchController.deleteRule);

export default router;
