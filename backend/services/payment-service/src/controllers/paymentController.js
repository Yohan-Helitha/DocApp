import crypto from 'crypto';
import env from '../config/environment.js';
import db from '../config/db.js';

const getPayHereBaseUrl = () =>
  env.PAYHERE_SANDBOX ? 'https://sandbox.payhere.lk' : 'https://www.payhere.lk';

export const createCheckout = async (req, res) => {
  const { appointmentId, patientId, amount, currency = 'LKR', items = 'Consultation fee' } = req.body;

  if (!appointmentId || !patientId || !amount) {
    return res.status(400).json({ error: 'missing_required_fields' });
  }

  try {
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');
      const insertRes = await client.query(
        `INSERT INTO payments (appointment_id, patient_id, amount, currency, provider, payment_status)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING payment_id, created_at`,
        [appointmentId, patientId, amount, currency, 'payhere', 'initiated']
      );

      const payment = insertRes.rows[0];

      const orderId = payment.payment_id;
      const merchantId = env.PAYHERE_MERCHANT_ID;
      const merchantSecret = env.PAYHERE_MERCHANT_SECRET;
      const amountStr = Number(amount).toFixed(2);

      const hash = crypto
        .createHash('md5')
        .update(
          `${merchantId}${orderId}${amountStr}${currency}${crypto
            .createHash('md5')
            .update(merchantSecret)
            .digest('hex')}`
        )
        .digest('hex')
        .toUpperCase();

      const checkoutPayload = {
        sandbox: env.PAYHERE_SANDBOX,
        action: `${getPayHereBaseUrl()}/pay/checkout`,
        fields: {
          merchant_id: merchantId,
          return_url: env.PAYHERE_RETURN_URL,
          cancel_url: env.PAYHERE_CANCEL_URL,
          notify_url: env.PAYHERE_NOTIFY_URL,
          order_id: orderId,
          items,
          amount: amountStr,
          currency,
          // Minimal customer details required by PayHere Simple Checkout
          first_name: 'Test',
          last_name: 'Patient',
          email: 'test.patient@example.com',
          phone: '0771234567',
          address: '123 Test Street',
          city: 'Colombo',
          country: 'Sri Lanka',
          hash,
          custom_1: patientId,
          custom_2: appointmentId
        }
      };

      await client.query('COMMIT');
      return res.status(201).json({ payment_id: payment.payment_id, checkout: checkoutPayload });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    req.log?.error({ err }, 'Failed to create checkout');
    return res.status(500).json({ error: 'checkout_failed' });
  }
};

export const handleProviderCallback = async (req, res) => {
  const {
    merchant_id: merchantId,
    order_id: orderId,
    payhere_amount: amount,
    payhere_currency: currency,
    status_code: statusCode,
    md5sig
  } = req.body || {};

  try {
    const localSecretHash = crypto.createHash('md5').update(env.PAYHERE_MERCHANT_SECRET).digest('hex');
    const localSig = crypto
      .createHash('md5')
      .update(`${merchantId}${orderId}${amount}${currency}${statusCode}${localSecretHash}`)
      .digest('hex')
      .toUpperCase();

    if (localSig !== md5sig) {
      return res.status(400).json({ error: 'invalid_signature' });
    }

    const status = String(statusCode) === '2' ? 'success' : String(statusCode) === '0' ? 'pending' : 'failed';

    await db.query(
      'UPDATE payments SET payment_status = $1, updated_at = now(), provider_reference = $2 WHERE payment_id = $3',
      [status, orderId, orderId]
    );

    return res.json({ received: true });
  } catch (err) {
    req.log?.error({ err }, 'Error handling PayHere callback');
    return res.status(500).json({ error: 'callback_failed' });
  }
};

export const getPaymentById = async (req, res) => {
  const { paymentId } = req.params;
  try {
    const result = await db.query('SELECT * FROM payments WHERE payment_id = $1', [paymentId]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'payment_not_found' });
    }
    return res.json({ payment: result.rows[0] });
  } catch (err) {
    req.log?.error({ err }, 'Error fetching payment');
    return res.status(500).json({ error: 'get_payment_failed' });
  }
};

export const createRefund = async (req, res) => {
  const { paymentId } = req.params;
  const { amount, reason } = req.body;

  if (!amount) {
    return res.status(400).json({ error: 'missing_amount' });
  }

  try {
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      const paymentRes = await client.query('SELECT * FROM payments WHERE payment_id = $1', [paymentId]);
      if (paymentRes.rowCount === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'payment_not_found' });
      }

      const insertRes = await client.query(
        `INSERT INTO refunds (payment_id, refund_amount, reason, refund_status)
         VALUES ($1, $2, $3, $4)
         RETURNING refund_id, requested_at`,
        [paymentId, amount, reason || null, 'requested']
      );

      await client.query('COMMIT');
      return res.status(201).json({ refund: insertRes.rows[0] });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    req.log?.error({ err }, 'Error creating refund');
    return res.status(500).json({ error: 'refund_failed' });
  }
};
