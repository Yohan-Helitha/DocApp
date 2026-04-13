import express from 'express';
import {
  createCheckout,
  handleProviderCallback,
  getPaymentById,
  createRefund,
  proxyCheckout
} from '../controllers/paymentController.js';

const router = express.Router();

// Add this line with your other routes:
router.post('/proxy-checkout', proxyCheckout);

router.post('/checkout', createCheckout);
router.post('/webhooks/provider-callback', handleProviderCallback);
router.get('/:paymentId', getPaymentById);
router.post('/:paymentId/refund', createRefund);

export default router;
