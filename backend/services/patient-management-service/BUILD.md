# Build & Deploy (Docker Desktop Kubernetes)

This repo uses **local Docker images** (tagged `docapp/*:local`) and deploys them to **Docker Desktop’s built-in Kubernetes** via manifests under `infra/k8s/*`.

All commands below are **PowerShell** and should be run from the **repo root**:

```powershell
cd C:\Users\helit\Documents\GitHub\DocApp
```

## Prerequisites

- Docker Desktop running
- Kubernetes enabled in Docker Desktop
- `kubectl` available (`kubectl version --client`)

## 1) (Optional) Clear Docker cache / old images

> Use this when you want a truly clean rebuild.

```powershell
# Stop & remove all containers
docker ps -aq | ForEach-Object { docker rm -f $_ }

# Prune build cache (BuildKit)
docker builder prune -af

# Remove unused images/containers/networks
docker system prune -af

# Optional: remove ALL images (including ones still referenced)
# WARNING: This deletes everything and can force long re-pulls.
# docker images -aq | ForEach-Object { docker rmi -f $_ }
```

## 2) Build images (no cache)

```powershell
# Backend services
docker build --no-cache --pull -t docapp/auth-service:local backend/services/auth-service
docker build --no-cache --pull -t docapp/patient-management-service:local backend/services/patient-management-service
docker build --no-cache --pull -t docapp/notification-service:local backend/services/notification-service

# API Gateway
docker build --no-cache --pull -t docapp/api-gateway:local backend/api-gateway

# Frontend
docker build --no-cache --pull -t docapp/frontend:local frontend
```

## 3) Deploy / redeploy to Kubernetes

### Apply manifests

```powershell
kubectl apply -f infra/k8s/api-gateway/
kubectl apply -f infra/k8s/auth-service/
kubectl apply -f infra/k8s/patient-management-service/
kubectl apply -f infra/k8s/notification-service/
kubectl apply -f infra/k8s/frontend/
```

### Restart workloads to pick up updates

```powershell
kubectl rollout restart deployment/api-gateway
kubectl rollout restart deployment/auth-service
kubectl rollout restart deployment/patient-management-service
kubectl rollout restart deployment/notification-service
kubectl rollout restart deployment/frontend
```

### Wait for rollouts

```powershell
kubectl rollout status deployment/api-gateway --timeout=180s
kubectl rollout status deployment/auth-service --timeout=240s
kubectl rollout status deployment/patient-management-service --timeout=240s
kubectl rollout status deployment/notification-service --timeout=240s
kubectl rollout status deployment/frontend --timeout=180s
```

## 4) Verify status and access services

```powershell
kubectl get deployments
kubectl get pods -o wide
kubectl get svc | Select-String -Pattern "api-gateway|auth-service|patient-management-service|notification-service|frontend"
```

Notes:
- Docker Desktop often maps `LoadBalancer` services to `localhost:<nodePort>`.
- If a deployment is stuck:

```powershell
kubectl describe pod -l app=notification-service
kubectl logs -l app=notification-service --tail=200
```

## 5) Common fixes

### Notification service fails on Twilio credentials

If `notification-service` crashes with Twilio errors (e.g., `accountSid must start with AC`), set valid values in the Kubernetes secret used by the deployment (typically `notification-db-secret`) or temporarily disable Twilio usage in code.

### Auth service seed script (initContainer)

Auth uses an initContainer to run `seed-doctor.js`. If it fails, the main container will never start.

---

## One-shot: Build + Redeploy (minimal)

```powershell
cd C:\Users\helit\Documents\GitHub\DocApp

docker build --no-cache --pull -t docapp/auth-service:local backend/services/auth-service
docker build --no-cache --pull -t docapp/patient-management-service:local backend/services/patient-management-service
docker build --no-cache --pull -t docapp/notification-service:local backend/services/notification-service
docker build --no-cache --pull -t docapp/api-gateway:local backend/api-gateway
docker build --no-cache --pull -t docapp/frontend:local frontend

kubectl apply -f infra/k8s/api-gateway/
kubectl apply -f infra/k8s/auth-service/
kubectl apply -f infra/k8s/patient-management-service/
kubectl apply -f infra/k8s/notification-service/
kubectl apply -f infra/k8s/frontend/

kubectl rollout restart deployment/api-gateway
kubectl rollout restart deployment/auth-service
kubectl rollout restart deployment/patient-management-service
kubectl rollout restart deployment/notification-service
kubectl rollout restart deployment/frontend
```
