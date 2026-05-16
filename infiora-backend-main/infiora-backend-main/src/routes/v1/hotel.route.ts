import express, { Router } from 'express';
import { validate } from '../../modules/validate';
import { auth } from '../../modules/auth';
import { hotelController, hotelValidation } from '../../modules/hotel';
import { isHotelOwner } from '../../modules/middleware';
import multerUpload from '../../modules/utils/multerUpload';

const router: Router = express.Router();

router
  .route('/')
  .post(
    auth('manageHotels'),
    multerUpload.fields([
      { name: 'image', maxCount: 1 },
      { name: 'cover', maxCount: 1 },
    ]),
    validate(hotelValidation.createHotel),
    hotelController.createHotel
  )
  .get(auth('getHotels'), validate(hotelValidation.getHotels), hotelController.getHotels);

router.route('/:hotelId/insights').get(auth('getHotels'), isHotelOwner, hotelController.getInsights);
router.post('/:hotelId/device-token', auth('getHotels'), isHotelOwner, hotelController.generateDeviceToken);
router.get('/:hotelId/operations-overview', auth('getHotels'), isHotelOwner, hotelController.getOperationsOverview);
router
  .route('/:hotelId/security-settings')
  .get(auth('getHotels'), isHotelOwner, hotelController.getSecuritySettings)
  .patch(auth('getHotels'), isHotelOwner, hotelController.updateSecuritySettings);
router
  .route('/:hotelId/premium-modules')
  .get(auth('getHotels'), isHotelOwner, hotelController.getPremiumModules)
  .patch(auth('getHotels'), isHotelOwner, hotelController.updatePremiumModules);
router.get(
  '/:hotelId/translation-cache-review',
  auth('getHotels'),
  isHotelOwner,
  hotelController.getTranslationCacheReview
);

router
  .route('/:hotelId')
  .get(auth('getHotels'), isHotelOwner, validate(hotelValidation.getHotel), hotelController.getHotel)
  .post(hotelController.socialLinkTap)
  .patch(
    auth('getHotels'),
    isHotelOwner,
    multerUpload.fields([
      { name: 'image', maxCount: 1 },
      { name: 'cover', maxCount: 1 },
    ]),
    validate(hotelValidation.updateHotel),
    hotelController.updateHotel
  )
  .delete(auth('manageHotels'), validate(hotelValidation.deleteHotel), hotelController.deleteHotel);

router.route('/:hotelId/timeslots/generate').post(auth('getHotels'), isHotelOwner, hotelController.triggerSlotGeneration);

export default router;
