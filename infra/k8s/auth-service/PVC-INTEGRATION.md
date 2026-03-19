Postgres PVC integration (auth-service)

Overview
- A PersistentVolumeClaim named `auth-postgres-pvc` stores Postgres data under `/var/lib/postgresql/data`.
- The Postgres Deployment mounts the claim at the data directory so data survives pod restarts.

How it's wired
- `postgres-deployment.yaml` mounts volume `postgres-data` from the claim `auth-postgres-pvc`.
- The claim is defined alongside the Postgres deployment as a simple 1Gi request.

Apply steps (later integration)
1. Ensure your cluster has a default StorageClass. Docker Desktop provides local storage; no extra config needed.
2. Apply the K8s objects:
   - `kubectl apply -f infra/k8s/auth-service`
3. Confirm the PVC is bound:
   - `kubectl get pvc auth-postgres-pvc`
4. If you add backups or migrations, mount init containers or run jobs that use the same claim.

Notes
- For a university project we keep this simple (no CSI volume snapshots, no dynamic provisioning tweaks). If you want persistence across host reboots or multi-node clusters, consider a hostPath or external storage provider and update the `storageClassName` accordingly.
