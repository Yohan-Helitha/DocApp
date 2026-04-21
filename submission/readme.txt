Deployment steps (update with your final implementation):

docker build -t docapp/api-gateway:local backend/api-gateway

docker build -t docapp/auth-service:local backend/services/auth-service
docker build -t docapp/patient-management-service:local backend/services/patient-management-service
docker build -t docapp/doctor-management-service:local backend/services/doctor-management-service
docker build -t docapp/appointment-service:local backend/services/appointment-service
docker build -t docapp/telemedicine-service:local backend/services/telemedicine-service
docker build -t docapp/payment-service:local backend/services/payment-service
docker build -t docapp/notification-service:local backend/services/notification-service
docker build -t docapp/admin-management-service:local backend/services/admin-management-service
docker build -t docapp/ai-symptom-checker-service:local backend/services/ai-symptom-checker-service

docker build -t docapp/frontend:local frontend


kubectl apply -f infra/k8s/base

kubectl apply -f infra/k8s/auth-service
kubectl apply -f infra/k8s/doctor-management-service
kubectl apply -f infra/k8s/patient-management-service
kubectl apply -f infra/k8s/notification-service
kubectl apply -f infra/k8s/appointment-service
kubectl apply -f infra/k8s/payment-service
kubectl apply -f infra/k8s/admin-management-service
kubectl apply -f infra/k8s/telemedicine

# IMPORTANT: deploy AI symptom checker (otherwise api-gateway routes can return 502)
# Requires secrets (kept local / gitignored):
# - infra/k8s/ai-symptom-checker-service/symptom-checker-db-secret.yaml (GEMINI_API_KEY, etc.)
# - infra/k8s/ai-symptom-checker-service/auth-public-key-secret.yaml (JWT RS256 public key)
kubectl apply -f infra/k8s/ai-symptom-checker-service
kubectl apply -f infra/k8s/api-gateway
kubectl apply -f infra/k8s/frontend

# Optional: public tunnel via ngrok (requires auth token secret)
kubectl apply -f infra/k8s/ngrok