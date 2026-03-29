# Admin Management Service

Admin-focused microservice for managing user accounts, doctor verification, and monitoring platform operations / financial records.

## Responsibilities
- List and manage user accounts and their status.
- Review and verify doctor registrations.
- Monitor financial transactions via aggregated monitoring records.
- Provide audit logs of admin actions and high-level dashboard metrics.

## Related documentation
- Service spec: `SERVICE_SPEC.md`
- Microservice overview: `docs/microservices/08-admin-management-service.md`
- Schema spec: `docs/schema-specifications/admin-management-schema.md`

## Environment
Key variables (see `.env` for defaults):
- `PORT` – HTTP port (default: 4008)
- `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE` – Postgres connection
- `DATABASE_URL` – optional single Postgres URL (overrides individual PG* vars)

## Local development (Docker Compose)

From the repo root:

```bash
docker compose -f infra/docker/docker-compose.yml up --build admin-management-service postgres
```

Then run the DB init script once against the shared `authdb`:

```bash
psql postgresql://postgres:postgres@localhost:5432/authdb \
  -f backend/services/admin-management-service/db/init.sql
```

Health check and APIs (after containers are up):
- `GET http://localhost:4008/health`
- Admin APIs under `/api/v1/admin/...` as listed in `SERVICE_SPEC.md`.

## Kubernetes deployment

This service reuses the same Postgres and credentials as the auth service.

1. Build and push image (example tag):
   ```bash
   docker build -t docapp/admin-management-service:local backend/services/admin-management-service
   docker push docapp/admin-management-service:local
   ```
2. Apply manifests (assuming auth DB ConfigMap/Secret and postgres are already applied):
   ```bash
   kubectl apply -f infra/k8s/admin-management-service/admin-deployment.yaml
   ```
3. Ensure DB schema is present in `authdb` using `db/init.sql` (as above).

The service is exposed inside the cluster as `admin-management-service` on port `4008`.
