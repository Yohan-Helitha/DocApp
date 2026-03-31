import express from 'express';
import {
  createCheckout,
  handleProviderCallback,
  getPaymentById,
  createRefund
} from '../controllers/paymentController.js';

const router = express.Router();

router.post('/checkout', createCheckout);
router.post('/webhooks/provider-callback', handleProviderCallback);
router.get('/:paymentId', getPaymentById);
router.post('/:paymentId/refund', createRefund);

export default router;
