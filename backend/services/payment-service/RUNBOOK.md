# Payment Service Runbook (Start + Deploy)

This runbook explains how to run and deploy the **payment-service** (port **4006**) correctly.

It covers:
- Local development (Node + Postgres)
- Docker run
- Kubernetes (Docker Desktop) deployment used by this repo

---

## 0) Prerequisites

- Node.js **18+**
- Docker Desktop (for Docker/K8s modes)
- `kubectl` configured to your local cluster

The service reads configuration from environment variables (via `dotenv/config`).

Health endpoint:
- `GET /health`

Main API routes:
- `POST /api/v1/payments/initiate`
- `POST /api/v1/payments/notify`

---

## 1) Local dev (recommended for backend-only testing)

### 1.1 Start Postgres (Docker)

From anywhere:

```powershell
docker run --name docapp-payment-postgres -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=paymentdb -p 5432:5432 -d postgres:15
```

Initialize schema:

```powershell
# Run init.sql inside the container
Get-Content .\db\init.sql | docker exec -i docapp-payment-postgres psql -U postgres -d paymentdb
```

### 1.2 Configure payment-service

From `backend/services/payment-service/`, create/edit `.env`:

```env
NODE_ENV=development
PORT=4006

# Option A (preferred): single connection string
PAYMENT_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/paymentdb

# Option B: individual PG vars (used if PAYMENT_DATABASE_URL is empty)
PAYMENT_PGHOST=localhost
PAYMENT_PGPORT=5432
PAYMENT_PGUSER=postgres
PAYMENT_PGPASSWORD=postgres
PAYMENT_PGDATABASE=paymentdb

LOG_LEVEL=info

# PayHere sandbox config
PAYHERE_MERCHANT_ID=1233913
PAYHERE_MERCHANT_SECRET=YOUR_SECRET
PAYHERE_SANDBOX=true

# For local-only testing you can leave these as localhost
# For real PayHere sandbox browser testing you typically want ngrok URLs
PAYHERE_RETURN_URL=https://docapp.ngrok.app/payhere/return
PAYHERE_CANCEL_URL=https://docapp.ngrok.app/payhere/cancel
PAYHERE_NOTIFY_URL=https://docapp.ngrok.app/api/v1/payments/notify

# Allow browser calls from your UI origin(s)
CORS_ORIGIN=http://localhost:8081,https://docapp.ngrok.app
```

### 1.3 Install + run

```powershell
npm install
npm run dev
```

### 1.4 Verify

```powershell
Invoke-RestMethod http://localhost:4006/health
```

Expected:

```json
{ "status": "ok", "env": "development" }
```

---

## 2) Docker (service container)

This is useful when you want the service running in a container but still using your local Postgres.

### 2.1 Build

From repo root:

```powershell
docker build -t docapp/payment-service:local .\backend\services\payment-service
```

### 2.2 Run

```powershell
docker run --rm -p 4006:4006 \
  -e NODE_ENV=production \
  -e PORT=4006 \
  -e PAYMENT_DATABASE_URL=postgresql://postgres:postgres@host.docker.internal:5432/paymentdb \
  -e PAYHERE_MERCHANT_ID=1233913 \
  -e PAYHERE_MERCHANT_SECRET=YOUR_SECRET \
  -e PAYHERE_SANDBOX=true \
  -e PAYHERE_RETURN_URL=https://docapp.ngrok.app/payhere/return \
  -e PAYHERE_CANCEL_URL=https://docapp.ngrok.app/payhere/cancel \
  -e PAYHERE_NOTIFY_URL=https://docapp.ngrok.app/api/v1/payments/notify \
  -e CORS_ORIGIN=http://localhost:8081,https://docapp.ngrok.app \
  docapp/payment-service:local
```

Verify:

```powershell
Invoke-RestMethod http://localhost:4006/health
```

---

## 3) Kubernetes (Docker Desktop) – repo’s deployment method

This repo deploys payment-service + its Postgres using manifests in:
- `infra/k8s/payment-service/`

### 3.1 Build the image locally

From repo root:

```powershell
docker build -t docapp/payment-service:local .\backend\services\payment-service
```

### 3.2 Apply database resources

```powershell
kubectl apply -f .\infra\k8s\payment-service\payment-db-config.yaml
kubectl apply -f .\infra\k8s\payment-service\payment-db-secret.yaml
kubectl apply -f .\infra\k8s\payment-service\payment-db-init-config.yaml
kubectl apply -f .\infra\k8s\payment-service\payment-postgres-deployment.yaml
```

Wait for Postgres:

```powershell
kubectl rollout status deploy/payment-postgres --timeout=120s
```

### 3.3 Create the PayHere secret (required)

The payment-service Deployment expects a Secret named `payhere-credentials` with keys:
- `PAYHERE_MERCHANT_ID`
- `PAYHERE_MERCHANT_SECRET`

Create/update it:

```powershell
kubectl create secret generic payhere-credentials `
  --from-literal=PAYHERE_MERCHANT_ID=1233913 `
  --from-literal=PAYHERE_MERCHANT_SECRET=YOUR_SECRET `
  --dry-run=client -o yaml | kubectl apply -f -
```

### 3.4 Deploy payment-service

```powershell
kubectl apply -f .\infra\k8s\payment-service\payment-deployment.yaml
kubectl rollout status deploy/payment-service --timeout=120s
```

### 3.5 Verify in-cluster

Port-forward and check health:

```powershell
kubectl port-forward svc/payment-service 4006:4006
```

In another terminal:

```powershell
Invoke-RestMethod http://localhost:4006/health
```

Logs:

```powershell
kubectl logs deploy/payment-service --tail=200
```

---

## 4) PayHere sandbox notes (when testing in a browser)

### 4.1 Why ngrok is involved

PayHere validates the submitting page’s Origin/Referer. For sandbox checkout, the SPA page that submits the form must be served from the authorized domain:
- `https://docapp.ngrok.app`

### 4.2 Required callback URLs

When running in Kubernetes with the ngrok workflow, these should be set (as currently in `infra/k8s/payment-service/payment-deployment.yaml`):
- `PAYHERE_RETURN_URL=https://docapp.ngrok.app/payhere/return`
- `PAYHERE_CANCEL_URL=https://docapp.ngrok.app/payhere/cancel`
- `PAYHERE_NOTIFY_URL=https://docapp.ngrok.app/api/v1/payments/notify`

The API Gateway then redirects the browser back to your local UI (`http://localhost:8081/#/payments/return` etc.).

### 4.3 If notify callbacks don’t arrive

- Confirm ngrok is running and points to the frontend service (repo config does this).
- Confirm `/api/v1/payments/notify` is reachable via `https://docapp.ngrok.app/api/v1/payments/notify`.
- Check payment-service logs for signature/merchant mismatch.

---

## 5) Common issues

- **`missing_payhere_config`**
  - Ensure `PAYHERE_MERCHANT_ID` and `PAYHERE_MERCHANT_SECRET` are set (locally or via k8s secret `payhere-credentials`).

- **DB connection errors**
  - Verify Postgres is running and `PAYMENT_DATABASE_URL` is correct.
  - If using PG vars, ensure `PAYMENT_PGHOST/USER/PASSWORD/PGDATABASE` match.

- **CORS errors in browser**
  - Set `CORS_ORIGIN` to include your UI origin(s), e.g. `http://localhost:8081,https://docapp.ngrok.app`.
