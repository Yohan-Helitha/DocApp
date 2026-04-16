# Payment Service — Outstanding Task (GAP-8)

> **Date:** 2026-04-16  
> **From:** Afham  
> **To:** Payment-service teammate  

---

## Status Summary

All appointment-service backend changes and all frontend changes for the new payment workflow have been implemented and are live. **The only remaining piece is in your service (payment-service).**

---

## The Single Task: Notify appointment-service when PayHere confirms payment

### Why this matters

When a patient pays, PayHere fires a webhook to your service (`POST /api/v1/payments/notify`). Your `handlePayHereNotify` function currently:

1. Verifies the PayHere signature ✅  
2. Updates `paymentdb.payments.payment_status = 'success'` ✅  
3. **Does NOT notify appointment-service** ❌  

Without step 3, `appointmentsdb.appointments.payment_status` stays `'unpaid'` forever. The patient never sees "Join Session", the doctor never sees the clinical action buttons, and the entire payment workflow is broken end-to-end.

---

## File to Edit

```
backend/services/payment-service/src/controllers/paymentController.js
```

### Exact location

Find the block inside `handlePayHereNotify` that ends with:

```js
      await client.query('COMMIT');
      return res.status(200).send('OK');
```

It is inside the inner `try` block, after the `payment_logs` insert attempt. Add the appointment-service callback call **between** the `COMMIT` and the `return`:

```js
      await client.query('COMMIT');

      // GAP-8: Notify appointment-service so it can unlock clinical actions.
      // Best-effort — do not fail the PayHere webhook response if this call fails.
      if (incomingStatus === 'success') {
        const appointmentServiceUrl = String(env.APPOINTMENT_SERVICE_URL || '').trim();
        const internalSecret = String(env.INTERNAL_SECRET || '').trim();
        if (appointmentServiceUrl && internalSecret && payment.appointment_id) {
          fetch(
            `${appointmentServiceUrl}/api/v1/appointments/${payment.appointment_id}/payment-status`,
            {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                'x-internal-secret': internalSecret,
              },
              body: JSON.stringify({ payment_status: 'paid' }),
            },
          ).catch((err) =>
            req.log?.warn({ err, appointmentId: payment.appointment_id }, 'Failed to notify appointment-service of payment'),
          );
        } else {
          req.log?.warn(
            { appointmentServiceUrl: !!appointmentServiceUrl, internalSecret: !!internalSecret },
            'APPOINTMENT_SERVICE_URL or INTERNAL_SECRET not configured — skipping appointment-service callback',
          );
        }
      }

      return res.status(200).send('OK');
```

> **Note:** The call is intentionally fire-and-forget (no `await`). PayHere requires a quick `200 OK` response to its webhook. If we awaited the appointment-service call, a slow/unreachable appointment-service would cause PayHere to retry the webhook unnecessarily.

---

## Environment Variables to Add

### 1. `backend/services/payment-service/src/config/environment.js`

Add two new lines to the exported object:

```js
  APPOINTMENT_SERVICE_URL: getEnv('APPOINTMENT_SERVICE_URL', 'http://localhost:4003'),
  INTERNAL_SECRET: getEnv('INTERNAL_SECRET', ''),
```

### 2. `backend/services/payment-service/.env`

Add:

```
APPOINTMENT_SERVICE_URL=http://appointment-service:4003
INTERNAL_SECRET=change-me-internal
```

> **Important:** The `INTERNAL_SECRET` value must match exactly what is set in `backend/services/appointment-service/.env` for `INTERNAL_SECRET`. Ask Afham for the value if needed.

### 3. `infra/docker/docker-compose.yml` — payment-service section

The payment-service block already has an `environment:` section. Add the two new vars:

```yaml
  payment-service:
    build: ../../backend/services/payment-service
    env_file:
      - ../../backend/services/payment-service/.env
    environment:
      - PAYMENT_PGHOST=payment-postgres
      - PAYMENT_PGPORT=5432
      - PAYMENT_PGUSER=postgres
      - PAYMENT_PGPASSWORD=postgres
      - PAYMENT_PGDATABASE=paymentdb
      - PAYMENT_DATABASE_URL=postgresql://postgres:postgres@payment-postgres:5432/paymentdb
      - APPOINTMENT_SERVICE_URL=http://appointment-service:4003   # ← ADD THIS
      - INTERNAL_SECRET=change-me-internal                        # ← ADD THIS
```

---

## Endpoint Being Called (Afham's side — already implemented)

```
PUT /api/v1/appointments/:appointmentId/payment-status
Header: x-internal-secret: <INTERNAL_SECRET>
Body:   { "payment_status": "paid" }

200 OK  → appointment row updated, clinical actions unlocked
401     → wrong or missing x-internal-secret (check env var values match)
404     → appointmentId not found
```

No JWT is required for this call — it uses the shared internal secret only.

---

## Rebuild After Changes

```bash
docker compose -f infra/docker/docker-compose.yml up --build --no-deps -d payment-service
```

---

## How to Verify It Works

1. Create a test appointment and have the doctor accept it.
2. Click **Pay Now** on the patient dashboard — this calls your `POST /api/v1/payments/initiate`.
3. Complete the PayHere sandbox checkout (use sandbox card: `4916217501611292`, CVV: `023`, expiry: any future date).
4. PayHere fires the notify webhook to your service.
5. Check your payment-service logs — you should see:
   - `"Updated payment status from notify callback"` with `status: 'success'`
   - No `"Failed to notify appointment-service"` warning
6. Reload the patient's appointments page — `payment_status` on the confirmed appointment should now show the **Join Session** button.
7. Reload the doctor's appointments page — the appointment should now show **Create Session**, **Mark Complete**, **Write Prescription** (no longer "Awaiting Payment").
