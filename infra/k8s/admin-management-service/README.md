# Admin Management Service (Kubernetes)

Kubernetes manifests for the Admin Management microservice, mirroring the Auth service setup.

## Files
- `admin-deployment.yaml` – Deployment + Service resources for the admin-management-service.

## Prerequisites
- Auth Postgres and storage are already deployed using:
  - `infra/k8s/auth-service/postgres-deployment.yaml`
  - `infra/k8s/auth-service/auth-db-config.yaml`
  - `infra/k8s/auth-service/auth-db-secret.yaml`
- The admin service image is built and pushed, e.g. `docapp/admin-management-service:local`.
- The `authdb` database contains both the auth tables and the admin tables defined in:
  - `backend/services/admin-management-service/db/init.sql`

## Deploy

1. **Apply the deployment and service**

   ```bash
   kubectl apply -f infra/k8s/admin-management-service/admin-deployment.yaml
   ```

   This will:
   - Run `admin-management-service` pods.
   - Expose them inside the cluster as a `ClusterIP` service on port `4008`.

2. **Verify pods and service**

   ```bash
   kubectl get deployments
   kubectl get pods -l app=admin-management-service
   kubectl get svc admin-management-service
   ```

3. **Check health endpoint**

   From inside the cluster (e.g. a debug pod):

   ```bash
   curl http://admin-management-service:4008/health
   ```

## Environment wiring

`admin-deployment.yaml` reuses the same Postgres credentials and host as the Auth service:
- `PGHOST=auth-postgres`
- `PGPORT=5432`
- `PGDATABASE` and `PGUSER` from `auth-db-config` ConfigMap.
- `PGPASSWORD` from `auth-db-secret` Secret.

This ensures both Auth and Admin services operate on the same logical database, sharing the `users` table while the admin service also uses its own tables for actions, doctor reviews, and financial monitoring records.
