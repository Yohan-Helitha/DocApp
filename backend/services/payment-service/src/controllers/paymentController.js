import crypto from 'crypto';
import env from '../config/environment.js';
import db from '../config/db.js';

const getPayHereBaseUrl = () =>
  env.PAYHERE_SANDBOX ? 'https://sandbox.payhere.lk' : 'https://www.payhere.lk';

const getPayHereMerchantSecret = () => String(env.PAYHERE_MERCHANT_SECRET || '').trim();

const md5Upper = (value) =>
  crypto.createHash('md5').update(String(value ?? ''), 'utf8').digest('hex').toUpperCase();

const normalizeCurrency = (currency) => String(currency || '').trim().toUpperCase();

const formatAmount2dp = (amount) => {
  const n = typeof amount === 'number' ? amount : Number(amount);
  if (!Number.isFinite(n) || n <= 0) {
    throw new Error('amount must be greater than zero');
  }
  return n.toFixed(2);
};

const generatePayHereHash = ({ orderId, amountStr, currency }) => {
  const merchantId = String(env.PAYHERE_MERCHANT_ID || '').trim();
  const merchantSecret = getPayHereMerchantSecret();
  if (!merchantId || !merchantSecret) {
    const err = new Error('missing_payhere_config');
    err.code = 'missing_payhere_config';
    throw err;
  }

  const hashedSecret = md5Upper(merchantSecret);
  // PayHere checkout hash spec: MD5(merchant_id + order_id + amount + currency + UPPER(MD5(secret)))
  return md5Upper(`${merchantId}${String(orderId).trim()}${amountStr}${currency}${hashedSecret}`);
};

const generateNotifySignature = ({ merchantId, orderId, payhereAmount, payhereCurrency, statusCode }) => {
  const merchantSecret = getPayHereMerchantSecret();
  const hashedSecret = md5Upper(merchantSecret);
  return md5Upper(
    `${merchantId}${orderId}${payhereAmount}${payhereCurrency}${statusCode}${hashedSecret}`
  );
};

const mapPayHereStatusCode = (statusCode) => {
  const code = String(statusCode);
  if (code === '2') return 'success';
  if (code === '0') return 'pending';
  if (code === '-1') return 'cancelled';
  if (code === '-2') return 'failed';
  if (code === '-3') return 'charged_back';
  return 'unknown';
};

const canTransitionTo = (currentStatus, incomingStatus) => {
  const current = String(currentStatus || '').toLowerCase();
  const incoming = String(incomingStatus || '').toLowerCase();

  if (!current || current === 'initiated') return true;
  if (current === incoming) return false;

  // Terminal states should not go back to pending.
  const terminal = new Set(['success', 'failed', 'cancelled', 'charged_back']);
  if (terminal.has(current) && incoming === 'pending') return false;
  return true;
};

const sanitizeNotifyParams = (params) => {
  const sanitized = { ...(params || {}) };
  if (sanitized.md5sig) sanitized.md5sig = '[REDACTED]';
  return sanitized;
};

export const initiatePayment = async (req, res) => {
  const {
    appointmentId,
    patientId,
    amount,
    currency = 'LKR',
    items = 'Consultation fee',
    // Optional: when only the payment flow is served on the public ngrok domain
    // (for PayHere Origin/Referer checks) but the rest of the app lives on localhost,
    // you can pass where the browser should be redirected after PayHere completes.
    // Example: returnTo = 'http://localhost:8081/#/appointments/123?paid=1'
    returnTo,
    cancelTo,
    firstName,
    lastName,
    email,
    phone,
    address,
    city,
    country
  } = req.body || {};

  if (!appointmentId || !patientId || amount == null) {
    return res.status(400).json({ error: 'missing_required_fields' });
  }

  const normalizedCurrency = normalizeCurrency(currency);
  if (!/^[A-Z]{3}$/.test(normalizedCurrency)) {
    return res.status(400).json({ error: 'invalid_currency' });
  }

  let amountStr;
  try {
    amountStr = formatAmount2dp(amount);
  } catch (e) {
    return res.status(400).json({ error: 'invalid_amount' });
  }

  try {
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      const insertRes = await client.query(
        `INSERT INTO payments (appointment_id, patient_id, amount, currency, provider, payment_status)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING payment_id, created_at`,
        [appointmentId, patientId, amountStr, normalizedCurrency, 'payhere', 'pending']
      );

      const payment = insertRes.rows[0];
      const orderId = crypto.randomUUID();

      await client.query(
        'UPDATE payments SET provider_reference = $1, updated_at = now() WHERE payment_id = $2',
        [orderId, payment.payment_id]
      );

      const hash = generatePayHereHash({ orderId, amountStr, currency: normalizedCurrency });

      const withReturnTo = (baseUrl, to) => {
        const trimmed = String(baseUrl || '').trim();
        const target = String(to || '').trim();
        if (!trimmed || !target) return trimmed;
        try {
          const url = new URL(trimmed);
          url.searchParams.set('to', target);
          return url.toString();
        } catch {
          // Should not happen (these URLs are expected to be absolute), but keep it safe.
          const sep = trimmed.includes('?') ? '&' : '?';
          return trimmed + sep + 'to=' + encodeURIComponent(target);
        }
      };

      const checkout = {
        actionUrl: `${getPayHereBaseUrl()}/pay/checkout`,
        fields: {
          merchant_id: String(env.PAYHERE_MERCHANT_ID || '').trim(),
          return_url: withReturnTo(env.PAYHERE_RETURN_URL, returnTo),
          cancel_url: withReturnTo(env.PAYHERE_CANCEL_URL, cancelTo),
          notify_url: env.PAYHERE_NOTIFY_URL,
          order_id: orderId,
          items,
          amount: amountStr,
          currency: normalizedCurrency,
          first_name: firstName || 'Test',
          last_name: lastName || 'Patient',
          email: email || 'test.patient@example.com',
          phone: phone || '0771234567',
          address: address || '123 Test Street',
          city: city || 'Colombo',
          country: country || 'Sri Lanka',
          hash,
          custom_1: patientId,
          custom_2: appointmentId
        }
      };

      await client.query('COMMIT');

      req.log?.info(
        { paymentId: payment.payment_id, orderId, amountStr, currency: normalizedCurrency },
        'Prepared PayHere checkout payload'
      );

      return res.status(200).json({ paymentId: payment.payment_id, checkout });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    req.log?.error({ err }, 'Failed to initiate payment');
    const code = err?.code;
    if (code === 'missing_payhere_config') {
      return res.status(500).json({ error: 'missing_payhere_config' });
    }
    return res.status(500).json({ error: 'initiate_payment_failed' });
  }
};

export const handlePayHereNotify = async (req, res) => {
  const params = req.body || {};

  const merchantId = String(params.merchant_id || '').trim();
  const orderId = String(params.order_id || '').trim();
  const payhereAmount = String(params.payhere_amount || '').trim();
  const payhereCurrency = String(params.payhere_currency || '').trim();
  const statusCode = String(params.status_code || '').trim();
  const md5sig = String(params.md5sig || '').trim();

  req.log?.info(
    { orderId, paymentId: params.payment_id, statusCode },
    'Incoming PayHere notify callback'
  );
  req.log?.debug({ keys: Object.keys(params) }, 'Incoming PayHere notify payload keys');

  if (!merchantId || !orderId || !payhereAmount || !payhereCurrency || !statusCode || !md5sig) {
    return res.status(400).send('BAD_REQUEST');
  }

  if (merchantId !== String(env.PAYHERE_MERCHANT_ID || '').trim()) {
    req.log?.warn(
      { orderId, merchantId, configuredMerchantId: env.PAYHERE_MERCHANT_ID },
      'Rejected PayHere notify callback due to merchant mismatch'
    );
    return res.status(400).send('INVALID_MERCHANT');
  }

  const localSig = generateNotifySignature({
    merchantId,
    orderId,
    payhereAmount,
    payhereCurrency,
    statusCode
  });
  if (localSig.toUpperCase() !== md5sig.toUpperCase()) {
    req.log?.warn({ orderId, statusCode }, 'Rejected PayHere notify callback due to invalid signature');
    req.log?.debug({ orderId, localSig, md5sig }, 'Signature mismatch details');
    return res.status(400).send('INVALID_SIGNATURE');
  }

  try {
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      const paymentRes = await client.query(
        'SELECT * FROM payments WHERE provider_reference = $1 FOR UPDATE',
        [orderId]
      );
      if (paymentRes.rowCount === 0) {
        req.log?.warn({ orderId }, 'Payment not found for verified callback');
        await client.query('ROLLBACK');
        return res.status(404).send('PAYMENT_NOT_FOUND');
      }

      const payment = paymentRes.rows[0];
      const expectedCurrency = normalizeCurrency(payment.currency);
      const incomingCurrency = normalizeCurrency(payhereCurrency);
      if (expectedCurrency !== incomingCurrency) {
        req.log?.warn(
          { paymentId: payment.payment_id, orderId, expectedCurrency, incomingCurrency },
          'Rejected notify callback due to currency mismatch'
        );
        await client.query('ROLLBACK');
        return res.status(400).send('CURRENCY_MISMATCH');
      }

      let incomingAmountStr;
      try {
        incomingAmountStr = formatAmount2dp(payhereAmount);
      } catch {
        await client.query('ROLLBACK');
        return res.status(400).send('INVALID_AMOUNT');
      }
      const expectedAmountStr = formatAmount2dp(payment.amount);
      if (incomingAmountStr !== expectedAmountStr) {
        req.log?.warn(
          { paymentId: payment.payment_id, orderId, expectedAmountStr, incomingAmountStr },
          'Rejected notify callback due to amount mismatch'
        );
        await client.query('ROLLBACK');
        return res.status(400).send('AMOUNT_MISMATCH');
      }

      const incomingStatus = mapPayHereStatusCode(statusCode);
      if (canTransitionTo(payment.payment_status, incomingStatus)) {
        await client.query(
          'UPDATE payments SET payment_status = $1, updated_at = now() WHERE payment_id = $2',
          [incomingStatus, payment.payment_id]
        );
        req.log?.info(
          { paymentId: payment.payment_id, orderId, status: incomingStatus },
          'Updated payment status from notify callback'
        );
      } else {
        req.log?.info(
          {
            paymentId: payment.payment_id,
            orderId,
            currentStatus: payment.payment_status,
            incomingStatus
          },
          'Ignored out-of-order payment update'
        );
      }

      // Best-effort webhook log (table may not exist in older DBs)
      try {
        await client.query(
          `INSERT INTO payment_logs (payment_id, order_id, event_type, raw_payload)
           VALUES ($1, $2, $3, $4)`,
          [payment.payment_id, orderId, 'WEBHOOK_RECEIVED', JSON.stringify(sanitizeNotifyParams(params))]
        );
      } catch (logErr) {
        req.log?.debug({ err: logErr }, 'payment_logs table not available; skipping webhook log insert');
      }

      await client.query('COMMIT');
      return res.status(200).send('OK');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    req.log?.error({ err }, 'Error handling PayHere notify callback');
    return res.status(500).send('ERROR');
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