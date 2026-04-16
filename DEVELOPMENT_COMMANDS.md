# DocApp Development & Deployment Guide

This guide explains how to build, deploy, and manage your services. Follow the "Change & Update Loop" every time you modify the code.

---

## 🔄 The "Change & Update" Loop
Run these steps **every time** you make a change to a file and want to see it in your browser.

### Step 1: Build the Docker Image
Replace `<vX>` with the next version number (e.g., v22, v23).
*   **Frontend**: `docker build -t docapp/frontend:<vX> frontend`
*   **Patient Service**: `docker build -t docapp/patient-management-service:<vX> backend/services/patient-management-service`

### Step 2: Update the Kubernetes Deployment
Update the running pod to use your new image.
*   **Frontend**: `kubectl set image deployment/frontend frontend=docapp/frontend:<vX>`
*   **Patient Service**: `kubectl set image deployment/patient-management-servicedocker build --no-cache -t docapp/frontend:v30 frontend patient-management-service=docapp/patient-management-service:<vX>`

### Step 3: Verify the Deployment
*   **Check Status**: `kubectl get pods` (Wait until the status is "Running")
*   **Check Logs**: `kubectl logs -f <pod-name>` (Replace `<pod-name>` with the name from `get pods`)

---

## 🛠 Useful Management Commands

### Monitoring
*   **List all active pods**: `kubectl get pods`
*   **Watch pods in real-time**: `kubectl get pods -w`
*   **Describe a pod (if it fails to start)**: `kubectl describe pod <pod-name>`

### Connection (Port Forwarding)
*   **Access Backend via Gateway (8080)**: `kubectl port-forward service/api-gateway 8080:80`
*   **Access Frontend directly (8080)**: `kubectl port-forward service/frontend 8080:80`
*   **Access Patient DB (5433)**: `kubectl port-forward svc/patient-postgres 5433:5432`

### Cleanup (Docker)
*   **Remove all stopped containers**: `docker container prune`
*   **Remove unused images**: `docker image prune -a`
*   **List running containers (Docker local only)**: `docker ps`
    > *Note: In this project, your app runs in Kubernetes, so use `kubectl get pods` instead of `docker ps` to see your running services.*

---

## 📂 Project Organization
*   **Service sensitive backups**: `*_env_backup.txt` files have been moved to their respective service folders and are hidden from Git via `.gitignore`.
*   **Log Location**: Check logs via `kubectl logs` to find database errors (like unique constraint violations).
