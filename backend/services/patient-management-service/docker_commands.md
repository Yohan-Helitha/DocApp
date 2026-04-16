# Docker Commands for DocApp

This guide provides the essential Docker commands for managing the microservices in this project.

## 1. Patient Management Service (Port 6001)

### Build the Image

```powershell
docker build -t patient-management-service .
```

### Run the Container

```powershell
docker run -d `
  -p 6001:6001 `
  --name patient-app `
  -e PORT=6001 `
  -e DB_HOST=host.docker.internal `
  -e DB_USER=postgres `
  -e DB_PASSWORD=Lakni `
  -e DB_NAME=patient_management_db `
  -e DB_PORT=5432 `
  -e JWT_SECRET=8f3d2c1b9e7a6c5b4d3f2a1e0b9c8d7f6a5e4d3c2b1a0f9e8d7c6b5a4e3f2d1 `
  -e TZ=Asia/Colombo `
  patient-management-service
```

---

## 2. Notification Service (Port 6000)

### Build the Image

```powershell
docker build -t notification-service .
```

### Run the Container

```powershell
docker run -d `
  -p 6000:6000 `
  --name notification-app `
  -e PORT=6000 `
  -e DB_HOST=host.docker.internal `
  -e DB_USER=postgres `
  -e DB_PASSWORD=Lakni `
  -e DB_NAME=notification_db `
  -e DB_PORT=5432 `
  -e TZ=Asia/Colombo `
  notification-service
```

---

## 3. General Management Commands

### Stop and Remove a Container

```powershell
docker rm -f patient-app
docker rm -f notification-app
```

### View Logs

```powershell
docker logs -f patient-app
docker logs -f notification-app
```

### Check Running Containers

```powershell
docker ps
```

### Clean Up Unused Resources

```powershell
docker system prune -f
```

---

## 4. Multi-Service Cleanup & Rebuild (One-Liner)

Use this to quickly refresh the Patient Service after code changes:

```powershell
docker build -t patient-management-service .; docker rm -f patient-app; docker run -d -p 6001:6001 --name patient-app -e PORT=6001 -e DB_HOST=host.docker.internal -e DB_USER=postgres -e DB_PASSWORD=Lakni -e DB_NAME=patient_management_db -e DB_PORT=5432 -e JWT_SECRET=8f3d2c1b9e7a6c5b4d3f2a1e0b9c8d7f6a5e4d3c2b1a0f9e8d7c6b5a4e3f2d1 -e TZ=Asia/Colombo patient-management-service
```

I've updated docker_commands.md to highlight the core lifecycle commands (Start, Stop, and Remove) at the top for quick access.

### Core Docker Lifecycle Commands:

| Action             | Patient Service (Port 6001)                       | Notification Service (Port 6000)            |
| :----------------- | :------------------------------------------------ | :------------------------------------------ |
| **Build** Image    | `docker build -t patient-management-service .`    | `docker build -t notification-service .`    |
| **Start** Service  | `docker run -d --name patient-app ...` (see file) | `docker run -d --name notification-app ...` |
| **Stop** Service   | `docker stop patient-app`                         | `docker stop notification-app`              |
| **Remove** Service | `docker rm -f patient-app`                        | `docker rm -f notification-app`             |

### Quick Reference (One-Liners):

**To Build & Start Patient Management Service:**

```powershell
docker build -t patient-management-service .; docker rm -f patient-app; docker run -d -p 6001:6001 --name patient-app -e PORT=6001 -e DB_HOST=host.docker.internal -e DB_USER=postgres -e DB_PASSWORD=Lakni -e DB_NAME=patient_management_db -e DB_PORT=5432 -e JWT_SECRET=8f3d2c1b9e7a6c5b4d3f2a1e0b9c8d7f6a5e4d3c2b1a0f9e8d7c6b5a4e3f2d1 -e TZ=Asia/Colombo patient-management-service
```

**To Build & Start Notification Service:**

```powershell
docker build -t notification-service .; docker rm -f notification-app; docker run -d -p 6000:6000 --name notification-app -e PORT=6000 -e DB_HOST=host.docker.internal -e DB_USER=postgres -e DB_PASSWORD=Lakni -e DB_NAME=notification_db -e DB_PORT=5432 -e TZ=Asia/Colombo notification-service
```

**To Stop & Remove Everything:**

```powershell
docker rm -f patient-app notification-app
```
