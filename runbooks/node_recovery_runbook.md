# Operational Runbook: Node Recovery & Fleet Maintenance

This runbook outlines standard operating procedures (SOPs) for diagnosing, recovering, and maintaining the compute node infrastructure (HyperAI boxes and Iagon Cyclone Pro setup).

## 1. Preflight Diagnostics & Health Checks
Before restarting services or executing updates across the fleet, verify container health and system logs:

```bash
# Check status of all active Docker containers across the node
docker ps -a

# Inspect real-time system resource utilization and block storage mounts
df -h && free -m
```

## 2. Containerized Service Recovery (HyperAI & Validator Nodes)
If a validator preflight fails or a containerized service (such as Materios attestors or custom AI workloads) drops off the network:

2. **Gracefully stop and remove stale instances:**
   ```bash
   docker compose down
   ```

3. **Pull latest image builds and redeploy:**
   ```bash
   docker compose pull && docker compose up -d --force-recreate
   ```

## 3. Network & Storage Re-sync (Iagon Cyclone Pro)
- **IP Binding Verification:** Confirm local gateway routing and ensure static IP configurations remain stable after router reboots.
- **Storage State Check:** Verify that node storage volumes are correctly mapped without read-only lock states.
