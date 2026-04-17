# ngrok + docker-compose (DocApp)

This repo already supports running PayHere sandbox checkout behind an **authorized public domain** (`https://docapp.ngrok.app`).

In Kubernetes we used an ngrok tunnel so PayHere would accept the return/cancel origins. This document explains how to do the **same thing with docker-compose**, so you can test the payment flow locally *without deploying*.

> Important
> - **Do not commit** ngrok auth tokens.
> - If you use a **reserved domain** like `docapp.ngrok.app`, your ngrok account must own that reserved domain.

---

## Why ngrok is needed for PayHere (sandbox)

PayHere can reject checkout/redirect flows when the request/return originates from an unauthorized domain (e.g. plain `localhost`).

Our current frontend payment flow intentionally redirects users to the authorized domain:
- Patient clicks **Pay Now** in the app
- Frontend navigates to `https://docapp.ngrok.app/#/payments/checkout?...`
- The checkout page calls the backend to create the PayHere payload and then submits the PayHere form

This makes the browser originate from `docapp.ngrok.app`, satisfying PayHere sandbox domain validation.

---

## What we did in the Kubernetes deployment (reference)

In the Kubernetes setup we:

1. **Created a secret** holding the ngrok auth token (so the token is not in manifests):
   - Secret name: `ngrok-authtoken`
   - Key: `NGROK_AUTHTOKEN`

2. Deployed an **ngrok container** that:
   - Authenticates using the token from the secret
   - Creates a tunnel using the reserved domain `docapp.ngrok.app`
   - Forwards traffic to the in-cluster `frontend` service (port 80)

3. Ensured PayHere URLs point to the correct locations:
   - PayHere `notify_url` must reach the backend webhook endpoint (payment-service)
   - PayHere `return_url` and `cancel_url` send the browser back to the app routes

---

## docker-compose: how to run ngrok locally

### Prerequisites

- Docker Desktop running
- The stack runs via docker-compose:
  - Compose file: [infra/docker/docker-compose.yml](infra/docker/docker-compose.yml)
- An ngrok account with either:
  - a **reserved domain** `docapp.ngrok.app` (recommended, matches current code), or
  - a temporary assigned domain (works too, but you must update URLs accordingly)

### Step 1 — Create a local `.env` file (DO NOT COMMIT)

Create `infra/docker/.env` (or export env vars in your shell) with:

```env
# Required to start ngrok
NGROK_AUTHTOKEN=YOUR_NGROK_TOKEN_HERE

# If you have a reserved domain
NGROK_DOMAIN=docapp.ngrok.app

# If you don't have a reserved domain, leave NGROK_DOMAIN empty and use a normal tunnel.
# You will then use the printed ngrok URL instead of docapp.ngrok.app.
```

If your teammate does not have the reserved domain, they can still run ngrok, but the URL will be random (e.g. `https://xxxx.ngrok-free.app`).

---

## Step 2 — Add an ngrok service to docker-compose

Open [infra/docker/docker-compose.yml](infra/docker/docker-compose.yml) and add a service like this (adjust names/ports if your compose differs):

```yaml
  ngrok:
    image: ngrok/ngrok:alpine
    depends_on:
      - frontend
    environment:
      - NGROK_AUTHTOKEN=${NGROK_AUTHTOKEN}
    command:
      - "http"
      - "http://frontend:80"
      # If you own a reserved domain:
      - "--domain=${NGROK_DOMAIN}"
    ports:
      # Optional: expose ngrok's local web UI
      - "4040:4040"
```

Notes:
- `frontend:80` must match the compose service name/port for your frontend container.
- The `4040` port is optional but useful (ngrok request inspector).

---

## Step 3 — Start the stack

From the repo root:

```bash
docker compose -f infra/docker/docker-compose.yml --env-file infra/docker/.env up -d
```

Then check ngrok logs:

```bash
docker compose -f infra/docker/docker-compose.yml logs -f ngrok
```

If you used a reserved domain, you should see the tunnel published at:

- `https://docapp.ngrok.app`

If you did not use a reserved domain, ngrok will print the assigned public URL; use that URL in place of `docapp.ngrok.app`.

---

## Step 4 — Make PayHere URLs point to your local stack

PayHere uses three important URLs:

1. `notify_url` (server-to-server webhook)
2. `return_url` (browser redirect after payment)
3. `cancel_url` (browser redirect if user cancels)

### A) notify_url

`notify_url` must be reachable by PayHere. For docker-compose, you typically tunnel **API Gateway** or **payment-service**.

Recommended: tunnel the **frontend** for browser-origin requirements, and ensure `notify_url` points to an endpoint that is also public.

If your current implementation expects PayHere to hit the payment webhook via a public URL, you have two common options:

- **Option 1 (simple):** tunnel the API Gateway and use that as your notify URL
- **Option 2:** tunnel the payment-service directly and use that URL

### B) return_url / cancel_url

These should land the user back in the SPA:

- `#/payments/return`
- `#/payments/cancel`

If you are using the reserved domain tunnel:

- `https://docapp.ngrok.app/#/payments/return`
- `https://docapp.ngrok.app/#/payments/cancel`

---

## How the current frontend expects to work

The **Pay Now** button in the patient appointments UI navigates the browser to:

- `https://docapp.ngrok.app/#/payments/checkout?...`

So for docker-compose testing, you must ensure:

- The ngrok tunnel routes to your **frontend** container
- The domain used by the frontend code matches the tunnel domain

If you are not using `docapp.ngrok.app`, you must change the frontend to use your actual tunnel domain (temporary) for local testing.

---

## Quick checklist for teammates

- [ ] `NGROK_AUTHTOKEN` set locally (not committed)
- [ ] ngrok service added to compose and points to `frontend:80`
- [ ] Stack is up (`docker compose up -d`)
- [ ] `https://docapp.ngrok.app` loads the SPA
- [ ] PayHere `return_url/cancel_url` point to the SPA routes under that domain
- [ ] PayHere `notify_url` points to a publicly reachable webhook endpoint

---

## Troubleshooting

### PayHere says domain/origin not authorized
- Confirm the browser is on `https://docapp.ngrok.app` when initiating checkout.
- If using a random ngrok domain, update the app to use that domain.

### ngrok starts but `docapp.ngrok.app` fails
- The reserved domain may not belong to the current ngrok account.
- Remove `--domain=...` and use the random public URL.

### Webhook doesn’t update the appointment/payment status
- Confirm `notify_url` is publicly reachable and points to the correct service/route.
- Check payment-service logs and ensure signature verification passes.
