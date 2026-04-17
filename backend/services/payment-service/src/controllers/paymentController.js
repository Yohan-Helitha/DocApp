import crypto from 'crypto';
import axios from 'axios';
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

const mapPaymentStatusForAdmin = (paymentStatus) => {
  const s = String(paymentStatus || '').trim().toLowerCase();
  if (s === 'success') return 'completed';
  if (s === 'pending') return 'pending';
  if (s === 'failed' || s === 'cancelled' || s === 'charged_back' || s === 'unknown') return 'failed';
  return s || 'unknown';
};

const http = axios.create({
  timeout: 5000,
  validateStatus: () => true,
});

const normalizePaymentMethod = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return null;
  const upper = raw.toUpperCase();
  if (upper.includes('VISA')) return 'Visa';
  if (upper.includes('MASTER')) return 'Mastercard';
  return raw;
};

const extractCardLast4 = (params) => {
  const candidates = [
    params?.card_no,
    params?.card_number,
    params?.cardNo,
    params?.cardNumber,
    params?.card,
  ];
  for (const c of candidates) {
    const s = String(c || '').trim();
    if (!s) continue;
    const m = s.match(/(\d{4})\s*$/);
    if (m) return m[1];
  }
  return null;
};

const extractPaymentMethod = (params) =>
  normalizePaymentMethod(
    params?.method || params?.card_type || params?.payment_method || params?.payhere_method,
  );

const fetchAppointmentPaymentContext = async (appointmentId, logger) => {
  const base = String(env.APPOINTMENT_SERVICE_URL || '').trim().replace(/\/$/, '');
  const internalSecret = String(env.INTERNAL_SECRET || '').trim();
  if (!base || !internalSecret || !appointmentId) return null;

  try {
    const basePath = `${base}/api/v1/internal/appointments/${encodeURIComponent(
      String(appointmentId),
    )}`;

    const tryGet = async (path) => {
      const res = await http.get(path, {
        headers: {
          'x-internal-secret': internalSecret,
        },
      });
      return { status: res.status, body: res?.data ?? null };
    };

    // Prefer v2 (enriched doctor contact), but fall back to v1 for older deployments.
    const v2 = await tryGet(`${basePath}/payment-context-v2`);
    if (v2.status >= 200 && v2.status < 300) return v2.body?.context || null;

    const v1 = await tryGet(`${basePath}/payment-context`);
    if (v1.status >= 200 && v1.status < 300) return v1.body?.context || null;

    logger?.warn?.(
      { status: v2.status, body: v2.body, appointmentId },
      'Failed to fetch appointment payment context',
    );
    return null;
  } catch (err) {
    logger?.warn?.({ err: err?.message || err, appointmentId }, 'Failed to fetch appointment payment context');
    return null;
  }
};

const upsertAdminTransaction = async (
  {
    transactionId,
    appointmentId,
    amount,
    currency,
    status,
    provider,
    patientEmail,
    doctorEmail,
  },
  logger,
) => {
  const base = String(env.ADMIN_SERVICE_URL || '').trim().replace(/\/$/, '');
  const apiKey = String(env.INTERNAL_API_KEY || '').trim();
  if (!base || !apiKey || !transactionId || amount == null || !currency || !status) return;

  try {
    const url = `${base}/api/v1/internal/admin/transactions/upsert`;
    const res = await http.post(
      url,
      {
        transaction_id: transactionId,
        appointment_id: appointmentId || null,
        amount,
        currency,
        status,
        provider: provider || null,
        patient_email: patientEmail || null,
        doctor_email: doctorEmail || null,
      },
      {
        headers: {
          'x-internal-api-key': apiKey,
        },
      },
    );
    if (res.status < 200 || res.status >= 300) {
      const body = res?.data ?? null;
      logger?.warn?.(
        { status: res.status, body, transactionId },
        'Admin transaction upsert failed',
      );
    }
  } catch (err) {
    logger?.warn?.({ err: err?.message || err, transactionId }, 'Admin transaction upsert failed');
  }
};

const sendPaymentInvoiceNotification = async (
  {
    callerId,
    callerRole,
    recipientUserId,
    recipientEmail,
    appointmentId,
    doctorName,
    doctorEmail,
    patientName,
    patientEmail,
    amount,
    currency,
    transactionId,
    paymentMethod,
    cardLast4,
    slot,
  },
  logger,
) => {
  const base = String(env.NOTIFICATION_SERVICE_URL || '').trim().replace(/\/$/, '');
  if (!base || !recipientUserId || !recipientEmail) return;

  try {
    const url = `${base}/api/v1/notifications/send-email`;
    const res = await http.post(
      url,
      {
        recipient_user_id: String(recipientUserId),
        recipient_email: String(recipientEmail),
        channel: 'email',
        template_code: 'PAYMENT_INVOICE',
        message: 'Your payment was successful. Your invoice is available.',
        payload_json: {
          subject: 'Invoice - Payment confirmed',
          appointmentId: appointmentId || null,
          doctorName: doctorName || null,
          doctorEmail: doctorEmail || null,
          patientName: patientName || null,
          patientEmail: patientEmail || recipientEmail || null,
          transactionId: transactionId || null,
          amount: amount != null ? String(amount) : null,
          currency: currency || null,
          paymentMethod: paymentMethod || null,
          cardLast4: cardLast4 || null,
          slot: slot || null,
        },
      },
      {
        headers: {
          'x-user-id': String(callerId || recipientUserId),
          'x-user-role': String(callerRole || 'patient'),
        },
      },
    );

    if (res.status < 200 || res.status >= 300) {
      const body = res?.data ?? null;
      logger?.warn?.(
        { status: res.status, body, recipientEmail, appointmentId },
        'Payment invoice notification failed',
      );
    }
  } catch (err) {
    logger?.warn?.(
      { err: err?.message || err, recipientEmail, appointmentId },
      'Payment invoice notification failed',
    );
  }
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

      // PayHere return redirects do not reliably include custom_1/custom_2.
      // Our SPA reads appointmentId from the hash fragment query, so include it
      // directly in the return URL.
      const withHashParam = (urlStr, key, value) => {
        const raw = String(urlStr || '').trim();
        const k = String(key || '').trim();
        const v = String(value || '').trim();
        if (!raw || !k || !v) return raw;

        const hashIndex = raw.indexOf('#');
        if (hashIndex === -1) {
          const sep = raw.includes('?') ? '&' : '?';
          return raw + sep + encodeURIComponent(k) + '=' + encodeURIComponent(v);
        }

        const base = raw.slice(0, hashIndex);
        const fragment = raw.slice(hashIndex + 1);
        const qIndex = fragment.indexOf('?');
        const fragPath = qIndex === -1 ? fragment : fragment.slice(0, qIndex);
        const fragQuery = qIndex === -1 ? '' : fragment.slice(qIndex + 1);

        const params = new URLSearchParams(fragQuery);
        params.set(k, v);
        return `${base}#${fragPath}?${params.toString()}`;
      };

      const checkout = {
        actionUrl: `${getPayHereBaseUrl()}/pay/checkout`,
        fields: {
          merchant_id: String(env.PAYHERE_MERCHANT_ID || '').trim(),
          return_url: withHashParam(withReturnTo(env.PAYHERE_RETURN_URL, returnTo), 'appointmentId', appointmentId),
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

      // Best-effort: create/refresh a pending transaction record for Admin.
      // Do not block checkout initiation on admin sync failures.
      fetchAppointmentPaymentContext(appointmentId, req.log)
        .then((ctx) =>
          upsertAdminTransaction(
            {
              transactionId: payment.payment_id,
              appointmentId,
              amount: amountStr,
              currency: normalizedCurrency,
              status: 'pending',
              provider: 'payhere',
              patientEmail: ctx?.patient_email || null,
              doctorEmail: ctx?.doctor_email || null,
            },
            req.log,
          ),
        )
        .catch(() => {});

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
      const shouldApplyStatusUpdate = canTransitionTo(payment.payment_status, incomingStatus);
      if (shouldApplyStatusUpdate) {
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

      // Best-effort: sync to Admin transaction table + audit log.
      // Do not block webhook response on failures.
      fetchAppointmentPaymentContext(payment.appointment_id, req.log)
        .then((ctx) =>
          upsertAdminTransaction(
            {
              transactionId: payment.payment_id,
              appointmentId: payment.appointment_id,
              amount: expectedAmountStr,
              currency: expectedCurrency,
              status: mapPaymentStatusForAdmin(incomingStatus),
              provider: payment.provider || 'payhere',
              patientEmail: ctx?.patient_email || null,
              doctorEmail: ctx?.doctor_email || null,
            },
            req.log,
          ),
        )
        .catch(() => {});

      // GAP-8: Notify appointment-service so it can unlock clinical actions.
      // Best-effort — do not fail the PayHere webhook response if this call fails.
      if (incomingStatus === 'success') {
        const appointmentServiceUrl = String(env.APPOINTMENT_SERVICE_URL || '').trim();
        const internalSecret = String(env.INTERNAL_SECRET || '').trim();
        if (appointmentServiceUrl && internalSecret && payment.appointment_id) {
          try {
            const url = `${String(appointmentServiceUrl).trim().replace(/\/$/, '')}/api/v1/appointments/${encodeURIComponent(
              String(payment.appointment_id),
            )}/payment-status`;
            http
              .put(
                url,
                { payment_status: 'paid' },
                {
                  headers: {
                    'x-internal-secret': internalSecret,
                  },
                },
              )
              .then((r) => {
                if (r.status < 200 || r.status >= 300) {
                  req.log?.warn(
                    { status: r.status, appointmentId: payment.appointment_id },
                    'Failed to notify appointment-service of payment',
                  );
                }
              })
              .catch((err) =>
                req.log?.warn(
                  { err: err?.message || err, appointmentId: payment.appointment_id },
                  'Failed to notify appointment-service of payment',
                ),
              );
          } catch (err) {
            req.log?.warn(
              { err: err?.message || err, appointmentId: payment.appointment_id },
              'Failed to notify appointment-service of payment'
            );
          }
        } else {
          req.log?.warn(
            { appointmentServiceUrl: !!appointmentServiceUrl, internalSecret: !!internalSecret },
            'APPOINTMENT_SERVICE_URL or INTERNAL_SECRET not configured — skipping appointment-service callback'
          );
        }

        // Payment invoice email + in-app notification — only on genuine status transitions.
        if (shouldApplyStatusUpdate) {
          const method = extractPaymentMethod(params);
          const last4 = extractCardLast4(params);
          fetchAppointmentPaymentContext(payment.appointment_id, req.log)
            .then((ctx) =>
              sendPaymentInvoiceNotification(
                {
                  callerId: payment.patient_id || ctx?.patient_id,
                  callerRole: 'patient',
                  recipientUserId: payment.patient_id || ctx?.patient_id,
                  recipientEmail: ctx?.patient_email || null,
                  appointmentId: payment.appointment_id,
                  doctorName: ctx?.doctor_name || null,
                  doctorEmail: ctx?.doctor_email || null,
                  patientName: ctx?.patient_name || null,
                  patientEmail: ctx?.patient_email || null,
                  amount: expectedAmountStr,
                  currency: expectedCurrency,
                  transactionId: payment.payment_id,
                  paymentMethod: method,
                  cardLast4: last4,
                  slot:
                    ctx?.slot_date && ctx?.start_time && ctx?.end_time
                      ? `${ctx.slot_date} ${String(ctx.start_time).slice(0, 5)}-${String(ctx.end_time).slice(0, 5)}`
                      : null,
                },
                req.log,
              ),
            )
            .catch(() => {});
        }
      }

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