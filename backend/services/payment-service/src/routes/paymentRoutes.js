import express from 'express';
import {
  initiatePayment,
  handlePayHereNotify,
  getPaymentById,
  createRefund
} from '../controllers/paymentController.js';

const router = express.Router();

router.post('/initiate', initiatePayment);
router.post('/notify', handlePayHereNotify);

// Backward-compatible aliases
router.post('/checkout', initiatePayment);
router.post('/webhooks/provider-callback', handlePayHereNotify);
router.get('/:paymentId', getPaymentById);
router.post('/:paymentId/refund', createRefund);

export default router;
