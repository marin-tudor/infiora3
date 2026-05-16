import express, { Router } from 'express';
import { validate } from '../../modules/validate';
import { auth } from '../../modules/auth';
import { batchController, batchValidation } from '../../modules/batch';

const router: Router = express.Router();

router
  .route('/')
  .post(auth('manageBatches'), validate(batchValidation.createBatch), batchController.createBatch)
  .get(auth('getBatches'), validate(batchValidation.getBatches), batchController.getBatches);

router
  .route('/:batchId')
  .get(auth('getBatches'), validate(batchValidation.getBatch), batchController.getBatch)
  .patch(auth('manageBatches'), validate(batchValidation.updateBatch), batchController.updateBatch)
  .delete(auth('manageBatches'), validate(batchValidation.deleteBatch), batchController.deleteBatch);

export default router;
