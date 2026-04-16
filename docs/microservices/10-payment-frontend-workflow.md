# Frontend Payment Workflow (Localhost → Ngrok → PayHere Sandbox → Localhost)

This document describes the **intended frontend payment UX** when most of the app runs on `localhost`, but PayHere requires the checkout form to be submitted from an **authorized public domain** (here: `https://docapp.ngrok.app`).

The solution is:
1) User starts on the main app on `localhost`.
2) Clicking **Pay Now / Proceed to Checkout** opens the payment checkout page on `https://docapp.ngrok.app`.
3) That page submits the form to PayHere Sandbox.
4) PayHere returns to `https://docapp.ngrok.app/payhere/return` (or `/payhere/cancel`).
5) The gateway **bounces** the user back to `http://localhost:8081/#/payments/return` (or `/cancel`) and forwards PayHere query params.

---

## Why the ngrok hop is required

PayHere Sandbox rejects checkout requests if the submitting page’s **Origin/Referer** is not authorized.

- Submitting from `http://localhost:8081` typically fails with **Unauthorized payment request**.
- Submitting from `https://docapp.ngrok.app` succeeds.

So the *checkout page itself* must run on the ngrok domain.

---

## Components involved

- **Frontend (SPA)**
  - Checkout page route: `/#/payments/checkout`
  - Result pages: `/#/payments/return`, `/#/payments/cancel`

- **API Gateway**
  - Proxies API calls (e.g. `/api/v1/payments/initiate`).
  - Hosts PayHere return/cancel endpoints:
    - `/payhere/return`
    - `/payhere/cancel`
  - These endpoints **redirect back to localhost** after PayHere.

- **Payment Service**
  - `POST /api/v1/payments/initiate`
    - Creates a payment record.
    - Generates PayHere `order_id` + `hash`.
    - Returns `{ actionUrl, fields }` for the frontend to POST to PayHere.

- **Ngrok (in-cluster)**
  - Exposes the **frontend service** at the stable domain: `https://docapp.ngrok.app`.

---

## Required configuration (already supported in repo)

### 1) Ngrok domain serves the frontend

Kubernetes deployment forwards the reserved domain to the frontend service:
- `infra/k8s/ngrok/ngrok-deployment.yaml`

Expected:
- `https://docapp.ngrok.app/` loads the SPA.

### 2) Frontend proxies API routes to API Gateway

The frontend container uses nginx reverse-proxy:
- `/api/*` → `api-gateway:4000`
- `/payhere/*` → `api-gateway:4000`

This allows the SPA on `docapp.ngrok.app` to call the backend using same-origin URLs.

### 3) PayHere callbacks

Payment Service uses these environment variables:
- `PAYHERE_RETURN_URL=https://docapp.ngrok.app/payhere/return`
- `PAYHERE_CANCEL_URL=https://docapp.ngrok.app/payhere/cancel`
- `PAYHERE_NOTIFY_URL=https://docapp.ngrok.app/api/v1/payments/notify`

### 4) Bounce-back to localhost defaults

API Gateway supports redirecting the browser back to your local app after PayHere:
- `PAYHERE_DEFAULT_RETURN_TO=http://localhost:8081/#/payments/return`
- `PAYHERE_DEFAULT_CANCEL_TO=http://localhost:8081/#/payments/cancel`
- `PAYHERE_RETURN_TO_ALLOWLIST=localhost,127.0.0.1`

These are set in:
- `infra/k8s/api-gateway/api-gateway-deployment.yaml`

The gateway also supports an override `to=` query param, but defaults are enough for most dev flows.

---

## Frontend implementation: Pay button on localhost

### Desired UX

From a localhost page (e.g. appointment details / booking confirmation), clicking **Pay Now** should:
- open the payment checkout page on `docapp.ngrok.app` with enough info to initiate payment
- (optionally) open in the same tab or a new tab

### Minimal implementation

From your localhost page, redirect to the checkout route on the ngrok domain:

```js
// Example values — use real IDs from your app state
const appointmentId = '...';
const patientId = '...';
const amount = 1800;
const currency = 'LKR';

const checkoutUrl = new URL('https://docapp.ngrok.app/#/payments/checkout');
checkoutUrl.searchParams.set('appointmentId', appointmentId);
checkoutUrl.searchParams.set('patientId', patientId);
checkoutUrl.searchParams.set('amount', String(amount));
checkoutUrl.searchParams.set('currency', currency);

// same-tab
window.location.href = checkoutUrl.toString();

// or new-tab
// window.open(checkoutUrl.toString(), '_blank', 'noopener,noreferrer');
```

### What happens next

- The checkout page (`/#/payments/checkout`) calls:
  - `POST /api/v1/payments/initiate`
- The backend returns PayHere form fields and the browser submits to PayHere.
- PayHere returns to `https://docapp.ngrok.app/payhere/return?...`.
- The gateway immediately redirects to:
  - `http://localhost:8081/#/payments/return?...` (or cancel)

Your local page can read PayHere query params from the hash route (e.g. `order_id`, `status_code`).

---

## Local dev: how to run/test

1) Keep your local SPA reachable (example port-forward):

```bash
kubectl port-forward svc/frontend 8081:80
```

2) Use your normal localhost app to start the flow.

3) Click Pay Now (or manually test):

- Checkout:
  - `https://docapp.ngrok.app/#/payments/checkout?...`

- Return test (no PayHere needed):
  - `https://docapp.ngrok.app/payhere/return?order_id=TEST&payment_id=TEST&status_code=2`

Expected browser redirect:
- `http://localhost:8081/#/payments/return?order_id=TEST&payment_id=TEST&status_code=2`

---

## Troubleshooting

- **"Unauthorized payment request" on PayHere**
  - Ensure the checkout page is opened from `https://docapp.ngrok.app` (not localhost).

- **Return/cancel redirects to localhost but shows ERR_CONNECTION_REFUSED**
  - Your local app is not listening at the configured host/port.
  - Fix by:
    - starting `kubectl port-forward svc/frontend 8081:80`, or
    - updating `PAYHERE_DEFAULT_RETURN_TO`/`PAYHERE_DEFAULT_CANCEL_TO`.

- **API calls fail when browsing `docapp.ngrok.app`**
  - Ensure frontend nginx proxies `/api` to the gateway.
  - Verify that `https://docapp.ngrok.app/api/v1/payments/initiate` works.

---

## Security notes (dev-friendly but safe)

- Redirect targets are allowlisted by hostname (`PAYHERE_RETURN_TO_ALLOWLIST`) to prevent open redirects.
- Only allow `localhost` / `127.0.0.1` in dev.
- For production, remove the localhost bounce and use your real domain.
