# Local Blue-Green Deployment Walkthrough

## Project Title

Local-to-Cloud Blue-Green Deployment for a NestJS Ecommerce Application

## Purpose of This Document

This document explains, in beginner-friendly language, everything completed before the Azure phase of the project.

The goal is to help a beginner understand:

- What problem this project solves
- Why Blue-Green deployment is useful
- How the existing NestJS ecommerce app was prepared
- Why each major code change was made
- What each command does
- How Docker, Trivy, Kubernetes, Ingress, Prometheus, and Grafana fit together
- What evidence proves the local phase worked

This document covers the local validation phase only. The Azure phase comes later.

---

## 1. What We Built

We took an existing ecommerce application and prepared it for a production-style Blue-Green deployment workflow.

The local architecture validated was:

```text
Developer Machine
    ↓
Docker Build
    ↓
Trivy Security Scan
    ↓
Minikube Kubernetes Cluster
    ↓
NGINX Ingress
    ↓
Stable Kubernetes Service
    ↓
Blue Pods / Green Pods
    ↓
Prometheus Metrics
    ↓
Grafana Dashboard
```

The key idea is that users do not connect directly to Blue or Green pods. Users connect to one stable entry point, and Kubernetes decides which version receives traffic.

---

## 2. What Blue-Green Deployment Means

Blue-Green deployment is a release strategy where two versions of an application exist at the same time.

In this project:

```text
Blue = current stable version
Green = new candidate version
```

Blue ran as:

```text
ecommerce-app:v1.0.0-blue
```

Green ran as:

```text
ecommerce-app:v2.0.0-green
```

The Kubernetes Service initially sent traffic to Blue:

```yaml
selector:
  app: ecommerce
  version: blue
```

When Green was ready, we switched traffic by changing the Service selector:

```yaml
selector:
  app: ecommerce
  version: green
```

This is safer than deleting old pods or changing the Ingress route directly, because the public entry point stays stable.

---

## 3. Why We Used One Stable Service

The project requirement was:

```text
NGINX Ingress → one ClusterIP Service → Blue/Green Pods
```

This means the Ingress should not switch directly between Blue and Green. Instead, the Ingress always points to the same Service:

```text
ecommerce-service
```

The Service decides whether traffic goes to Blue or Green by using labels.

This is the correct pattern for this project because:

- The public routing layer remains stable.
- Rollback is fast.
- Traffic switching is simple.
- The deployment pattern is easy to explain and defend.
- It mirrors real-world progressive delivery patterns.

---

## 4. Local Database Preparation

The NestJS backend uses Prisma and PostgreSQL.

A local PostgreSQL service already existed on port `5432`, but it rejected the expected credentials.

To avoid fighting the existing local database, we created a dedicated Docker PostgreSQL container on port `5433`.

Command used:

```bash
docker run -d \
  --name ecommerce-postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=ecommerce_dev \
  -p 5433:5432 \
  postgres:16-alpine
```

Line-by-line explanation:

```bash
docker run -d
```

Starts a new container in detached mode. Detached mode means the container runs in the background.

```bash
--name ecommerce-postgres
```

Gives the container a clear name so it can be stopped, started, or inspected easily.

```bash
-e POSTGRES_USER=postgres
```

Creates the PostgreSQL username.

```bash
-e POSTGRES_PASSWORD=postgres
```

Creates the PostgreSQL password.

```bash
-e POSTGRES_DB=ecommerce_dev
```

Creates a database called `ecommerce_dev`.

```bash
-p 5433:5432
```

Maps port `5433` on the host machine to port `5432` inside the container.

PostgreSQL normally listens on `5432` inside the container. We used `5433` on the host to avoid conflict with the existing local PostgreSQL service.

```bash
postgres:16-alpine
```

Uses the lightweight Alpine-based PostgreSQL 16 Docker image.

---

## 5. Environment Configuration

The backend needed a `.env` file similar to this:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/ecommerce_dev"
JWT_SECRET="local-dev-secret-change-later"
PORT=3000
APP_NAME="ecommerce-app"
APP_VERSION="v1.0.0"
APP_ENV="blue"
```

Explanation:

```env
DATABASE_URL
```

Tells Prisma how to connect to PostgreSQL.

```env
JWT_SECRET
```

Provides a local secret used by authentication-related logic.

```env
PORT=3000
```

Tells the NestJS application to listen on port `3000`.

```env
APP_NAME
```

Stores the application name.

```env
APP_VERSION
```

Stores the current application version.

```env
APP_ENV
```

Stores whether the running instance is Blue or Green.

These values allowed the app to expose its version and deployment environment through `/api/v1/version`.

---

## 6. Version Endpoint

We added a version endpoint:

```text
/api/v1/version
```

This endpoint returns information like:

```json
{
  "app": "ecommerce-app",
  "version": "v1.0.0",
  "environment": "blue",
  "status": "ok",
  "timestamp": "2026-06-08T17:17:25.067Z"
}
```

Why this matters:

- It proves whether traffic is reaching Blue or Green.
- It helps validate deployment switching.
- It makes rollback evidence easy to capture.
- It is useful in real production systems for release visibility.

Example evidence:

```text
version=v1.0.0
environment=blue
```

and after switching:

```text
version=v2.0.0
environment=green
```

---

## 7. Metrics Endpoint

We added a Prometheus-compatible metrics endpoint:

```text
/api/v1/metrics
```

This endpoint exposes metrics in Prometheus text format.

Important custom metric:

```text
ecommerce_app_info{app="ecommerce-app",version="v1.0.0",environment="blue"} 1
```

or:

```text
ecommerce_app_info{app="ecommerce-app",version="v2.0.0",environment="green"} 1
```

Why this matters:

- Prometheus can scrape the application.
- Grafana can visualize the active version.
- Monitoring can confirm whether Blue or Green is active.
- It makes the project more production-like.

---

## 8. Why Tests Were Fixed

The existing test suite had several problems.

Issues fixed included:

- A stale test expected `Hello World!`
- Prisma generated client path was not resolving
- `.js` import mapping caused Jest issues
- `src/*` aliases were not resolving
- Some NestJS unit tests lacked required dependency mocks

Why this matters:

A deployment pipeline is only trustworthy if tests pass before building and deploying.

Final result:

```text
All Jest test suites passed
NestJS build passed
```

This proves the app was not just containerized blindly. It was validated first.

---

## 9. Dockerfile Purpose

A Dockerfile was created for the backend.

The purpose of the Dockerfile is to package the NestJS app into a portable runtime image.

The image can then run consistently in:

- Local Docker
- Minikube
- AKS
- CI/CD pipelines

Important fix:

The original Docker command expected:

```text
dist/main.js
```

But the actual build output was:

```text
dist/src/main.js
```

So the Docker CMD was corrected.

Why this matters:

If the CMD points to the wrong file, the Docker image may build successfully but fail when the container starts.

---

## 10. Blue and Green Docker Images

Two images were built:

```bash
docker build -t ecommerce-app:v1.0.0-blue .
```

```bash
docker build -t ecommerce-app:v2.0.0-green .
```

Explanation:

```bash
docker build
```

Builds a Docker image from a Dockerfile.

```bash
-t ecommerce-app:v1.0.0-blue
```

Tags the image with a readable name and version.

```bash
.
```

Uses the current directory as the Docker build context.

Blue represented the stable version.

Green represented the new candidate version.

---

## 11. Running Containers Locally

The containers were tested before Kubernetes.

A key option used was:

```bash
--add-host=host.docker.internal:host-gateway
```

Why this was needed:

The app inside the container needed to connect back to PostgreSQL running on the host through Docker networking.

Without this, the container may not be able to reach the host database.

This is an important real-world debugging point because container networking is different from normal local application networking.

---

## 12. Trivy Security Scanning

Trivy was used to scan the Docker images for HIGH and CRITICAL vulnerabilities.

Initial scan found a HIGH vulnerability:

```text
CVE-2026-33671
Library: picomatch
Severity: HIGH
```

The vulnerability was not from the application dependency tree. It came from npm bundled inside the Node runtime image.

Path:

```text
/usr/local/lib/node_modules/npm/node_modules/picomatch/package.json
```

The production container only needs `node` to run the compiled app. It does not need npm, npx, or corepack at runtime.

Fix applied in Dockerfile:

```dockerfile
RUN rm -rf /usr/local/lib/node_modules/npm \
    /usr/local/bin/npm \
    /usr/local/bin/npx \
    /usr/local/bin/corepack
```

Line-by-line explanation:

```dockerfile
RUN rm -rf /usr/local/lib/node_modules/npm
```

Removes npm from the final runtime image.

```text
/usr/local/bin/npm
```

Removes the npm executable.

```text
/usr/local/bin/npx
```

Removes npx.

```text
/usr/local/bin/corepack
```

Removes corepack.

Why this matters:

- Reduces runtime attack surface.
- Removes unnecessary package management tools from production image.
- Fixes the Trivy HIGH finding.
- Demonstrates security-aware container hardening.

Final result:

```text
Trivy HIGH/CRITICAL scan passed for Blue
Trivy HIGH/CRITICAL scan passed for Green
```

---

## 13. Minikube Preparation

Minikube was used to run Kubernetes locally.

We confirmed:

```bash
kubectl config use-context minikube
```

Explanation:

```bash
kubectl
```

The command-line tool for interacting with Kubernetes.

```bash
config use-context minikube
```

Switches kubectl to control the local Minikube cluster.

We also confirmed Minikube was running:

```bash
minikube status
```

This confirmed the local Kubernetes control plane was available.

---

## 14. Loading Docker Images into Minikube

Because Minikube runs its own container environment, local Docker images need to be loaded into Minikube.

The Blue and Green images were loaded.

Evidence confirmed:

```text
docker.io/library/ecommerce-app:v1.0.0-blue
docker.io/library/ecommerce-app:v2.0.0-green
```

Why this matters:

If the images are not available inside Minikube, Kubernetes pods will fail with image pull errors.

---

## 15. Kubernetes Namespace

A namespace was created:

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: ecommerce-bluegreen
```

Explanation:

```yaml
apiVersion: v1
```

Uses the stable Kubernetes API version for Namespace resources.

```yaml
kind: Namespace
```

Tells Kubernetes this file creates a namespace.

```yaml
metadata:
  name: ecommerce-bluegreen
```

Names the namespace.

Why this matters:

Namespaces separate resources and keep the project isolated from other workloads.

---

## 16. Blue Deployment

The Blue deployment ran two replicas of the Blue image.

Key values:

```yaml
name: ecommerce-blue
replicas: 2
image: ecommerce-app:v1.0.0-blue
version: blue
```

Why replicas matter:

Using two replicas proves the app can run more than one pod at the same time. This is closer to production than a single pod.

Why labels matter:

```yaml
labels:
  app: ecommerce
  version: blue
```

The Service uses these labels to decide where traffic goes.

If the Service selector says:

```yaml
version: blue
```

traffic goes to Blue pods.

---

## 17. Green Deployment

The Green deployment ran two replicas of the Green image.

Key values:

```yaml
name: ecommerce-green
replicas: 2
image: ecommerce-app:v2.0.0-green
version: green
```

Green is deployed before traffic is switched.

Why this matters:

The new version is already running and ready before users are sent to it.

This reduces deployment risk.

---

## 18. Readiness and Liveness Probes

Both Blue and Green deployments used probes.

Readiness probe:

```yaml
readinessProbe:
  httpGet:
    path: /api/v1/health/readiness
    port: 3000
```

Liveness probe:

```yaml
livenessProbe:
  httpGet:
    path: /api/v1/health/liveness
    port: 3000
```

Readiness means:

```text
Is the app ready to receive traffic?
```

Liveness means:

```text
Is the app still alive?
```

Why this matters:

Kubernetes should only send traffic to healthy pods.

---

## 19. Stable Kubernetes Service

The Service was created like this:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: ecommerce-service
  namespace: ecommerce-bluegreen
  labels:
    app: ecommerce
spec:
  type: ClusterIP
  selector:
    app: ecommerce
    version: blue
  ports:
    - name: http
      port: 80
      targetPort: 3000
```

Important line:

```yaml
selector:
  app: ecommerce
  version: blue
```

This means the Service sends traffic only to pods with:

```yaml
app: ecommerce
version: blue
```

Why this matters:

Traffic switching is controlled by changing the selector.

---

## 20. NGINX Ingress

Ingress was configured like this:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: ecommerce-ingress
  namespace: ecommerce-bluegreen
spec:
  ingressClassName: nginx
  rules:
    - host: ecommerce.local
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: ecommerce-service
                port:
                  number: 80
```

Key idea:

Ingress always points to:

```text
ecommerce-service
```

It does not point directly to Blue or Green.

Why this matters:

The external route stays stable.

The Service decides whether Blue or Green is active.

---

## 21. Applying Kubernetes Manifests

Commands used:

```bash
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/blue-deployment.yaml
kubectl apply -f k8s/green-deployment.yaml
kubectl apply -f k8s/service.yaml
kubectl apply -f k8s/ingress.yaml
```

Explanation:

```bash
kubectl apply
```

Creates or updates Kubernetes resources.

```bash
-f
```

Means the resource definition comes from a file.

Each YAML file defines one Kubernetes component.

---

## 22. Rollout Validation

Commands used:

```bash
kubectl rollout status deployment/ecommerce-blue -n ecommerce-bluegreen
kubectl rollout status deployment/ecommerce-green -n ecommerce-bluegreen
```

Explanation:

```bash
kubectl rollout status
```

Checks whether a Deployment successfully rolled out.

```bash
deployment/ecommerce-blue
```

Targets the Blue deployment.

```bash
-n ecommerce-bluegreen
```

Specifies the namespace.

Final result:

```text
deployment "ecommerce-blue" successfully rolled out
deployment "ecommerce-green" successfully rolled out
```

---

## 23. Endpoint Validation

The Service endpoints were checked.

Initial Blue endpoints:

```text
10.244.0.19:3000
10.244.0.22:3000
```

These matched the Blue pod IPs.

Why this matters:

It proves the Service was sending traffic to Blue only.

After switching to Green, endpoints became:

```text
10.244.0.20:3000
10.244.0.21:3000
```

These matched the Green pod IPs.

---

## 24. Ingress Testing Issue and Fix

Direct access to:

```text
http://ecommerce.local
```

failed in the local WSL/Minikube Docker-driver environment.

The Kubernetes configuration was correct, but host-to-Minikube networking did not expose port 80 as expected.

To solve this for local evidence, we port-forwarded the NGINX Ingress controller:

```bash
kubectl port-forward -n ingress-nginx service/ingress-nginx-controller 8080:80
```

Explanation:

```bash
kubectl port-forward
```

Forwards traffic from the local machine to a Kubernetes Service.

```bash
-n ingress-nginx
```

Uses the `ingress-nginx` namespace.

```bash
service/ingress-nginx-controller
```

Targets the NGINX Ingress controller Service.

```bash
8080:80
```

Maps local port `8080` to port `80` inside the Service.

Then requests were sent with the correct Host header:

```bash
curl -H "Host: ecommerce.local" http://localhost:8080/api/v1/version
```

Why the Host header matters:

Ingress rules use the host name to decide which backend route to use.

This preserved the architecture:

```text
localhost:8080
→ NGINX Ingress Controller
→ ecommerce-ingress rule
→ ecommerce-service
→ Blue or Green Pods
```

---

## 25. Blue to Green Switch

Traffic was switched to Green using:

```bash
kubectl patch service ecommerce-service \
  -n ecommerce-bluegreen \
  -p '{"spec":{"selector":{"app":"ecommerce","version":"green"}}}'
```

Line-by-line explanation:

```bash
kubectl patch service ecommerce-service
```

Updates the existing Service instead of replacing the whole YAML file.

```bash
-n ecommerce-bluegreen
```

Targets the correct namespace.

```bash
-p
```

Provides the patch payload.

```json
{"spec":{"selector":{"app":"ecommerce","version":"green"}}}
```

Changes the Service selector so it sends traffic to Green pods.

Result:

```text
version=v2.0.0
environment=green
```

---

## 26. Rollback from Green to Blue

Rollback was done with:

```bash
kubectl patch service ecommerce-service \
  -n ecommerce-bluegreen \
  -p '{"spec":{"selector":{"app":"ecommerce","version":"blue"}}}'
```

This changed traffic back to Blue.

Result:

```text
version=v1.0.0
environment=blue
```

Why this matters:

Rollback is fast because Blue pods were still running.

No rebuild was needed.

No redeployment was needed.

Only the Service selector changed.

---

## 27. Zero-Downtime Test

A script repeatedly called:

```text
/api/v1/version
```

while the Service selector was switched from Blue to Green.

Final result:

```text
Total requests: 51
Failed requests: 0
```

The output showed:

```text
Blue responses before switch
Green responses after switch
No failed requests during switch
```

Why this matters:

This proves that users could keep receiving successful HTTP responses during the deployment switch.

---

## 28. Prometheus and Grafana

Monitoring was installed using Helm and kube-prometheus-stack.

The monitoring stack included:

- Prometheus
- Grafana
- Alertmanager
- kube-state-metrics
- node-exporter
- Prometheus Operator

A ServiceMonitor was created so Prometheus could discover the ecommerce app.

ServiceMonitor purpose:

```text
Tell Prometheus where and how to scrape application metrics.
```

The custom metric was successfully queried:

```text
ecommerce_app_info
```

Result showed the active app version:

```text
v2.0.0
green
```

---

## 29. Grafana Secret Handling

Grafana generated an admin password.

That password was used locally but was not committed to GitHub.

Actions taken:

- Real password file deleted
- Redacted evidence file created
- `.gitignore` updated
- Secret scan performed
- Secret scan returned no leaked password value

Why this matters:

This demonstrates good DevOps hygiene.

Secrets must not be committed to source control.

---

## 30. Evidence Collected

Evidence was saved under:

```text
docs/evidence/
```

Important folders:

```text
00-clean-start
01-repo
03-tests-build
04-docker
05-trivy
06-minikube
07-blue-green
08-zero-downtime
09-monitoring
13-final
```

This makes the project auditable.

A reviewer can inspect evidence instead of trusting claims.

---

## 31. Final Local Result

The local phase passed.

Validated:

- Local app preparation
- Tests
- Build
- Docker image creation
- Runtime container validation
- Security scanning
- Kubernetes deployment
- Blue-Green switching
- Rollback
- Zero-downtime proof
- Prometheus scraping
- Grafana dashboard evidence
- Secret hygiene

Final local commit:

```text
552b44b Complete local blue-green deployment validation
```

---

## 32. Lessons Learned

Key engineering lessons:

1. A successful Docker build does not guarantee the container will run.
2. Container networking is different from host networking.
3. Kubernetes Services route traffic using labels and selectors.
4. Blue-Green deployment is safer when both versions are already running.
5. Rollback is faster when the old version remains available.
6. Trivy findings may come from the base/runtime image, not only app dependencies.
7. Removing unnecessary runtime tooling reduces attack surface.
8. Ingress issues can be caused by local networking even when Kubernetes config is correct.
9. Prometheus needs proper scrape configuration, not just a metrics endpoint.
10. Secrets must be handled carefully before committing to GitHub.

---

## 33. Beginner Mental Model

Think of the system like this:

```text
Ingress = front door
Service = traffic controller
Blue Pods = current shop
Green Pods = renovated shop
Prometheus = inspector collecting measurements
Grafana = dashboard showing the measurements
Trivy = security scanner
Docker = packaging system
Kubernetes = manager that runs and coordinates everything
```

The most important idea:

```text
We did not switch traffic by deleting Blue or changing the public route.
We switched traffic by changing the Service selector.
```

That is the heart of this Blue-Green deployment project.
