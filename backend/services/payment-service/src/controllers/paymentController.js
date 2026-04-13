import crypto from 'crypto';
import env from '../config/environment.js';
import db from '../config/db.js';

const getPayHereBaseUrl = () =>
  env.PAYHERE_SANDBOX ? 'https://sandbox.payhere.lk' : 'https://www.payhere.lk';

const getPayHereMerchantSecret = () => String(env.PAYHERE_MERCHANT_SECRET || '').trim();

const isLikelyPayHereAppSecret = (secret) => {
  const s = String(secret || '').trim();
  if (!s) return false;
  // App-type secret is commonly a long numeric string. Some setups may provide a 32-char MD5 hex.
  return /^\d+$/.test(s) || /^[a-fA-F0-9]{32}$/.test(s);
};

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

      const orderId = `ORD${Date.now()}`;
      const merchantId = env.PAYHERE_MERCHANT_ID;
      const merchantSecret = getPayHereMerchantSecret();
      const amountStr = Number(amount).toFixed(2);

      if (!merchantId || !merchantSecret) {
        return res.status(500).json({ error: 'missing_payhere_config' });
      }

      if (!isLikelyPayHereAppSecret(merchantSecret)) {
        req.log?.warn(
          { merchantSecretPreview: merchantSecret.slice(0, 6) },
          'PAYHERE_MERCHANT_SECRET format looks unexpected'
        );
        return res.status(500).json({ error: 'invalid_payhere_merchant_secret_format' });
      }

      const hash = crypto
        .createHash('md5')
        .update(`${merchantId}${orderId}${amountStr}${currency}${merchantSecret}`)
        .digest('hex')
        .toUpperCase();

      await client.query(
        'UPDATE payments SET provider_reference = $1 WHERE payment_id = $2',
        [orderId, payment.payment_id]
      );

      const notifyUrl = env.PAYHERE_NOTIFY_URL;

      const checkoutPayload = {
        sandbox: env.PAYHERE_SANDBOX,
        action: `${getPayHereBaseUrl()}/pay/checkout`,
        fields: {
          merchant_id: merchantId,
          return_url: env.PAYHERE_RETURN_URL,
          cancel_url: env.PAYHERE_CANCEL_URL,
          notify_url: notifyUrl,
          order_id: orderId,
          items,
          amount: amountStr,
          currency,
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

      req.log?.info(
        {
          merchantId,
          orderId,
          amountStr,
          currency,
          merchantSecret: merchantSecret.slice(0, 6) + '...',
          hash
        },
        'PayHere checkout hash debug'
      );

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
    const localSig = crypto
      .createHash('md5')
      .update(`${merchantId}${orderId}${amount}${currency}${statusCode}${getPayHereMerchantSecret()}`)
      .digest('hex')
      .toUpperCase();

    if (localSig !== md5sig) {
      return res.status(400).json({ error: 'invalid_signature' });
    }

    const status = String(statusCode) === '2' ? 'success'
                 : String(statusCode) === '0' ? 'pending'
                 : 'failed';

    await db.query(
      'UPDATE payments SET payment_status = $1, updated_at = now() WHERE provider_reference = $2',
      [status, orderId]
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

export const proxyCheckout = async (req, res) => {
  try {
    const fields = req.body;

    const formBody = new URLSearchParams(fields).toString();

    const response = await fetch('https://sandbox.payhere.lk/pay/checkout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Referer': 'https://docapp.lk/',
        'Origin': 'https://docapp.lk',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      body: formBody,
      redirect: 'manual'
    });

    req.log?.info({
      status: response.status,
      location: response.headers.get('location')
    }, 'PayHere proxy response');

    if (response.status === 301 || response.status === 302) {
      return res.redirect(response.headers.get('location'));
    }

    const html = await response.text();
    req.log?.info({ htmlPreview: html.slice(0, 300) }, 'PayHere proxy HTML response');
    res.setHeader('Content-Type', 'text/html');
    return res.send(html);

  } catch (err) {
    req.log?.error({ err }, 'PayHere proxy failed');
    return res.status(500).json({ error: 'proxy_failed' });
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