import express, { Router } from 'express';
import { validate } from '../../modules/validate';
import { auth } from '../../modules/auth';
import { linkController, linkValidation } from '../../modules/link';
import { isBodyRoomOrGroupOwner, isLinkOwner, isQueryRoomOrGroupOwner, isRoomOrGroupOwner } from '../../modules/middleware';
import multerUpload from '../../modules/utils/multerUpload';

const router: Router = express.Router();

router
  .route('/')
  .post(auth(), multerUpload.any(), validate(linkValidation.createLink), isBodyRoomOrGroupOwner, linkController.createLink)
  .get(auth(), validate(linkValidation.getLinks), isQueryRoomOrGroupOwner, linkController.getLinks);

router
  .route('/reorder/:id')
  .patch(auth(), validate(linkValidation.reorderLinks), isRoomOrGroupOwner, linkController.reorderLinks);

router
  .route('/:linkId')
  .get(validate(linkValidation.getLink), linkController.getLink)
  .patch(auth(), multerUpload.any(), validate(linkValidation.updateLink), isLinkOwner, linkController.updateLink)
  .delete(auth(), validate(linkValidation.deleteLink), isLinkOwner, linkController.deleteLink);

export default router;
