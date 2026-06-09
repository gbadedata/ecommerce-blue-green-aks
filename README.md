# Ecommerce Blue-Green Deployment on Azure AKS

A production-style DevOps project that takes an existing NestJS ecommerce API from source code to a validated Blue-Green deployment on Azure Kubernetes Service using GitHub Actions, Docker, Azure Container Registry, NGINX Ingress, Prometheus, Grafana, and evidence-based teardown.

Repository: `gbadedata/ecommerce-blue-green-aks`

---

## 1. Executive summary

This project implements a Blue-Green deployment workflow for a NestJS ecommerce backend. The goal was not only to deploy an application to Kubernetes, but to prove a full delivery path from GitHub to AKS with controlled release switching, rollback capability, security scanning, observability, public ingress validation, and final cost-control teardown.

The validated architecture follows this path:

```text
GitHub Source Code
→ GitHub Actions
→ Build and test application
→ Build Docker images
→ Scan Docker images with Trivy
→ Validate Blue-Green routing on Minikube
→ Push versioned images to Azure Container Registry
→ Deploy Blue and Green workloads to Azure Kubernetes Service
→ Route traffic through one ClusterIP Service
→ Switch active traffic by patching the Service selector
→ Expose the application using NGINX Ingress and Azure public LoadBalancer
→ Scrape metrics with Prometheus
→ Visualise metrics in Grafana
→ Validate alert rule
→ Capture evidence
→ Tear down Azure resources
```

The final active cloud release was Green:

```text
version: v2.0.0
environment: green
```

The final Azure resource group was deleted after validation to stop unnecessary cloud cost.

---

## 2. What this project demonstrates

This project demonstrates practical DevOps skills across application packaging, CI/CD, container security, Kubernetes deployment strategy, release validation, monitoring, and cloud cost control.

Key outcomes:

| Area | What was implemented |
|---|---|
| Application validation | NestJS backend tests and production build |
| Containerisation | Docker image build for Blue and Green versions |
| Security | Trivy HIGH/CRITICAL vulnerability gate |
| Local Kubernetes | Minikube Blue-Green validation |
| Cloud registry | Azure Container Registry image push |
| Cloud Kubernetes | AKS deployment with Blue and Green pods |
| Traffic switching | One ClusterIP Service with selector-based switching |
| Public access | NGINX Ingress Controller with Azure LoadBalancer |
| Observability | Prometheus metrics and Grafana dashboard |
| Alerting | PrometheusRule for missing application metric |
| CI/CD | GitHub Actions workflows for CI, Minikube, and AKS deployment |
| Evidence | Screenshots, command outputs, API responses, and teardown logs |
| Cost control | Final Azure teardown confirmation |

---

## 3. Architecture

### 3.1 Architecture flow

```text
Developer
  |
  v
GitHub Repository
  |
  v
GitHub Actions
  |
  +--> CI workflow
  |      +--> install dependencies
  |      +--> run tests
  |      +--> build NestJS application
  |      +--> build Docker image
  |      +--> run Trivy scan
  |
  +--> Minikube validation workflow
  |      +--> create Minikube cluster
  |      +--> deploy Blue and Green locally
  |      +--> switch Service selector
  |      +--> prove zero-failed-request switch
  |
  +--> Azure Blue-Green deployment workflow
         +--> build Blue and Green Docker images
         +--> scan both images
         +--> push both images to ACR
         +--> deploy to AKS
         +--> patch ecommerce-service selector to active version
         +--> install NGINX Ingress Controller
         +--> create Azure public LoadBalancer
         +--> apply ecommerce Ingress
         +--> validate public version endpoint
         +--> validate public metrics endpoint

Azure
  |
  +--> Azure Container Registry
  |
  +--> Azure Kubernetes Service
         |
         +--> Namespace: ecommerce-bluegreen
         |
         +--> Blue Deployment: v1.0.0
         |
         +--> Green Deployment: v2.0.0
         |
         +--> One ClusterIP Service: ecommerce-service
         |
         +--> NGINX Ingress Controller
         |
         +--> Prometheus
         |
         +--> Grafana
```

### 3.2 Why Blue-Green deployment?

Blue-Green deployment keeps two production-like environments available:

| Environment | Purpose |
|---|---|
| Blue | Current stable release |
| Green | New release candidate |

Traffic is controlled by a Kubernetes Service selector:

```yaml
selector:
  app: ecommerce
  version: green
```

This means the Service remains stable while the backend pods change. Users continue calling the same Service and Ingress route, but Kubernetes sends traffic to the selected version.

### 3.3 Why use one Service?

The architecture intentionally uses **one ClusterIP Service** for the ecommerce application.

The Service acts as the stable traffic entry point inside the cluster:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: ecommerce-service
  namespace: ecommerce-bluegreen
spec:
  type: ClusterIP
  selector:
    app: ecommerce
    version: green
```

The key benefit is that the Ingress does not need to change during release switching. Only the Service selector changes.

This is important because it keeps traffic switching small, auditable, and reversible.

---

## 4. Technology stack

| Layer | Technology |
|---|---|
| Application | NestJS, TypeScript, Prisma |
| Database used for validation | PostgreSQL |
| Container runtime | Docker |
| Local Kubernetes | Minikube |
| Cloud registry | Azure Container Registry |
| Cloud Kubernetes | Azure Kubernetes Service |
| Ingress | NGINX Ingress Controller |
| CI/CD | GitHub Actions |
| Vulnerability scanning | Trivy |
| Metrics | prom-client |
| Monitoring | Prometheus |
| Dashboard | Grafana |
| Cloud provider | Microsoft Azure |
| CLI tools | Azure CLI, kubectl, Helm, GitHub CLI |

---

## 5. Repository structure

```text
.
├── .github/
│   └── workflows/
│       ├── ci.yml
│       ├── minikube-validation.yml
│       └── azure-blue-green-deploy.yml
├── k8s/
│   ├── namespace.yaml
│   ├── blue-deployment.yaml
│   ├── green-deployment.yaml
│   ├── service.yaml
│   ├── ingress.yaml
│   ├── ecommerce-servicemonitor.yaml
│   └── aks/
│       ├── namespace.yaml
│       ├── postgres.yaml
│       ├── blue-deployment.yaml
│       ├── green-deployment.yaml
│       ├── service.yaml
│       ├── ingress.yaml
│       ├── ecommerce-servicemonitor.yaml
│       └── ecommerce-prometheusrule.yaml
├── server/
│   ├── Dockerfile
│   ├── .dockerignore
│   └── src/
│       └── components/
│           ├── health/
│           ├── version/
│           └── metrics/
├── scripts/
│   └── zero-downtime-test.sh
├── docs/
│   └── evidence/
└── README.md
```

---

## 6. Application changes

### 6.1 Version endpoint

A version endpoint was added:

```text
GET /api/v1/version
```

Example response:

```json
{
  "app": "ecommerce-app",
  "version": "v2.0.0",
  "environment": "green",
  "status": "ok",
  "timestamp": "2026-06-09T15:29:43.553Z"
}
```

#### What this does

It exposes the currently running application version and environment.

#### Why it matters

During Blue-Green deployment, the deployment only becomes meaningful when the active route can prove which version is receiving traffic.

#### When it is used

It is used during local Docker tests, Minikube validation, AKS internal validation, public Ingress validation, and GitHub Actions deployment validation.

#### Where it is used

It is called through:

```text
Docker container
Minikube Ingress
AKS internal Service
AKS public Ingress
GitHub Actions validation step
```

#### Implication

The team can verify whether the active runtime is Blue or Green without guessing from pod names.

#### Advantage

It makes release verification simple, repeatable, and evidence-friendly.

---

### 6.2 Metrics endpoint

A metrics endpoint was added:

```text
GET /api/v1/metrics
```

Example metric:

```text
ecommerce_app_info{app="ecommerce-app",version="v2.0.0",environment="green"} 1
```

#### What this does

It exposes Prometheus-compatible application metrics.

#### Why it matters

Monitoring should not only show that a pod is alive. It should also show which application version is currently being served.

#### When it is used

It is used after Kubernetes deployment and during Prometheus scraping.

#### Where it is used

Prometheus scrapes it through the `ecommerce-service` Service using a ServiceMonitor.

#### Implication

The deployment can be observed after traffic has been switched.

#### Advantage

The active version can be seen from monitoring data, not only from manual curl checks.

---

## 7. Docker implementation

### 7.1 Docker image purpose

Docker was used to package the NestJS application into a repeatable runtime image.

Two images were built:

```text
ecommerce-app:v1.0.0-blue
ecommerce-app:v2.0.0-green
```

In Azure Container Registry:

```text
acrecommercebg8070.azurecr.io/ecommerce-app:v1.0.0-blue
acrecommercebg8070.azurecr.io/ecommerce-app:v2.0.0-green
```

### 7.2 Important Dockerfile decision

The runtime image was hardened by removing npm tooling from the final image:

```dockerfile
RUN rm -rf /usr/local/lib/node_modules/npm \
    /usr/local/bin/npm \
    /usr/local/bin/npx \
    /usr/local/bin/corepack
```

#### What this does

It removes package-management tooling from the runtime container.

#### Why it was done

Trivy initially detected a HIGH vulnerability in `picomatch` bundled under the npm installation inside the Node runtime image.

#### When it matters

It matters at runtime because the container does not need npm, npx, or corepack to serve the built NestJS application.

#### Where it applies

It applies only to the final runtime layer of the image.

#### Implication

The runtime image has a smaller attack surface and passed the strict HIGH/CRITICAL vulnerability gate.

#### Advantage

It supports the principle of shipping only what is required to run the application.

---

## 8. Kubernetes implementation

### 8.1 Namespace

The application was deployed into its own namespace:

```text
ecommerce-bluegreen
```

#### Why this matters

A namespace separates project resources from default cluster resources and makes cleanup easier.

---

### 8.2 Blue Deployment

Blue represented the stable version:

```text
version: v1.0.0
environment: blue
```

The Blue pods used labels similar to:

```yaml
labels:
  app: ecommerce
  version: blue
```

---

### 8.3 Green Deployment

Green represented the candidate version:

```text
version: v2.0.0
environment: green
```

The Green pods used labels similar to:

```yaml
labels:
  app: ecommerce
  version: green
```

---

### 8.4 ClusterIP Service

The Service selected the active version:

```yaml
selector:
  app: ecommerce
  version: green
```

#### What this does

It sends traffic only to pods matching the selected version.

#### Why it matters

This is the core of the Blue-Green switch.

#### When it is changed

It is changed during release promotion or rollback.

#### Where it is changed

It is patched in Kubernetes:

```bash
kubectl patch service ecommerce-service \
  -n ecommerce-bluegreen \
  -p '{"spec":{"selector":{"app":"ecommerce","version":"green"}}}'
```

#### Implication

The Ingress and client-facing route remain stable while backend traffic moves between Blue and Green.

#### Advantage

Rollback is fast because switching back only requires another Service selector patch.

---

### 8.5 Ingress

The AKS Ingress exposed the application publicly through NGINX Ingress Controller and an Azure public LoadBalancer.

Host used for validation:

```text
ecommerce-aks.local
```

The validation curl used a Host header:

```bash
curl -H "Host: ecommerce-aks.local" http://PUBLIC_IP/api/v1/version
```

#### What this does

It routes public HTTP traffic into the cluster and then to the ecommerce Service.

#### Why it matters

The architecture required a public path through NGINX Ingress.

#### When it is used

It is used after the AKS deployment workflow completes and the Azure LoadBalancer IP is available.

#### Where it is used

It is used in the GitHub Actions Azure workflow.

#### Implication

The deployment proves that the application is reachable from outside the cluster.

#### Advantage

It validates the real external traffic path, not only internal Kubernetes networking.

---

## 9. GitHub Actions workflows

### 9.1 CI workflow

Workflow:

```text
.github/workflows/ci.yml
```

Purpose:

```text
Push or pull request
→ install dependencies
→ run tests
→ build application
→ build Docker image
→ run Trivy scan
```

#### Why this matters

It prevents broken or vulnerable changes from progressing silently.

#### Evidence

```text
docs/evidence/15-github-actions/github-actions-ci-push-success.png
docs/evidence/15-github-actions/github-actions-run-list.txt
```

---

### 9.2 Minikube validation workflow

Workflow:

```text
.github/workflows/minikube-validation.yml
```

Purpose:

```text
Push or pull request
→ create Minikube cluster
→ deploy Blue and Green
→ switch Service selector
→ validate Kubernetes routing
```

#### Why this matters

It proves the Blue-Green logic before cloud deployment.

#### Evidence

```text
docs/evidence/15-github-actions/github-actions-minikube-push-success.png
docs/evidence/15-github-actions/github-actions-minikube-green-summary.txt
```

---

### 9.3 Azure Blue-Green deployment workflow

Workflow:

```text
.github/workflows/azure-blue-green-deploy.yml
```

Purpose:

```text
Manual workflow dispatch
→ build Blue and Green images
→ scan images
→ push images to ACR
→ deploy to AKS
→ switch active Service selector
→ install NGINX Ingress Controller
→ apply ecommerce Ingress
→ wait for Azure public LoadBalancer IP
→ validate public version endpoint
→ validate public metrics endpoint
```

#### Why the Azure workflow is manual

The Azure deployment workflow is manually triggered using `workflow_dispatch`.

This is intentional because it avoids creating paid Azure resources on every push.

#### Implication

CI and Minikube validation run automatically on push, while Azure deployment behaves like a controlled release action.

#### Evidence

```text
docs/evidence/16-github-actions-azure-deploy/github-actions-azure-deploy-green.png
docs/evidence/16-github-actions-azure-deploy/github-actions-azure-deploy-steps.png
docs/evidence/19-github-actions-ingress/github-actions-public-ingress-validation.txt
```

---

## 10. Monitoring and alerting

### 10.1 Prometheus

Prometheus was installed using kube-prometheus-stack.

It discovered the ecommerce application using a ServiceMonitor.

Metric validated:

```text
ecommerce_app_info
```

Live validation showed Green pods:

```text
version="v2.0.0"
environment="green"
```

### 10.2 Grafana dashboard

Dashboard name:

```text
Ecommerce Blue-Green Deployment Overview
```

Dashboard panels:

```text
Active Ecommerce Version
Ecommerce Pods Scraped by Prometheus
Node.js Event Loop Lag
```

Grafana was accessed through port-forwarding rather than being exposed publicly.

#### Why this matters

Keeping Grafana internal reduces unnecessary public exposure and avoids adding extra cloud risk.

### 10.3 Alert rule

Alert name:

```text
EcommerceAppInfoMissing
```

Rule purpose:

```text
Detect when ecommerce_app_info disappears from ecommerce-service.
```

Validation result:

```text
Alert rule exists.
Application metric exists.
Alert is not firing.
```

This is the expected healthy state.

#### Evidence

```text
docs/evidence/17-grafana-dashboard-alert/grafana-dashboard-browser-view.png
docs/evidence/17-grafana-dashboard-alert/grafana-dashboard-export.json
docs/evidence/17-grafana-dashboard-alert/prometheus-alert-rule-verification.txt
docs/evidence/17-grafana-dashboard-alert/alert-rule-result-explanation.txt
```

---

## 11. Evidence map

| Evidence area | Location |
|---|---|
| Local app validation | `docs/evidence/02-local-app` |
| Tests and build | `docs/evidence/03-tests-build` |
| Docker validation | `docs/evidence/04-docker` |
| Trivy scan | `docs/evidence/05-trivy` |
| Minikube deployment | `docs/evidence/06-minikube` |
| Blue-Green switching | `docs/evidence/07-blue-green` |
| Zero-downtime validation | `docs/evidence/08-zero-downtime` |
| Local monitoring | `docs/evidence/09-monitoring` |
| Azure preflight | `docs/evidence/10-azure-preflight` |
| ACR validation | `docs/evidence/11-acr` |
| AKS deployment | `docs/evidence/12-aks` |
| Public Ingress validation | `docs/evidence/13-final` |
| AKS cloud monitoring | `docs/evidence/14-aks-cloud-monitoring` |
| GitHub Actions | `docs/evidence/15-github-actions` |
| GitHub Actions Azure deployment | `docs/evidence/16-github-actions-azure-deploy` |
| Grafana dashboard and alert | `docs/evidence/17-grafana-dashboard-alert` |
| GitHub Actions public Ingress | `docs/evidence/19-github-actions-ingress` |
| Final teardown | `docs/evidence/20-final-teardown` |

---

## 12. Challenges and resolutions

| Challenge | Cause | Resolution | Lesson |
|---|---|---|---|
| Local PostgreSQL credential conflict | Existing local PostgreSQL rejected expected credentials | Used a dedicated Docker PostgreSQL container on port 5433 | Isolate project dependencies to reduce environment conflicts |
| Prisma Node version warning | Prisma package expected a newer Node version | Used a Node 22 base image for Docker builds | Align runtime versions with dependency requirements |
| Jest failures | Stale test expectations, missing mocks, and module alias issues | Updated tests, mocks, and import mappings | CI should validate the actual project structure |
| Docker CMD path mismatch | NestJS build output path was `dist/src/main.js` | Corrected Docker CMD | Always inspect build output before writing Docker runtime commands |
| Host port conflict | Blue container already occupied port 3000 when testing Green | Used different ports and stopped conflicting containers | Version testing needs clear port discipline |
| Container to host database access | Docker container could not reach host database through localhost | Used `--add-host=host.docker.internal:host-gateway` | Container networking differs from host networking |
| Trivy HIGH vulnerability | npm bundled vulnerable transitive package in runtime image | Removed npm, npx, and corepack from final runtime image | Runtime images should contain only required runtime assets |
| Original GitHub repo push denied | User did not have write permission to the organisation repository | Created portfolio repo under `gbadedata` and pushed there | Portfolio projects should be controlled by the owner |
| GitHub Actions Trivy action tag failed | Workflow referenced an unavailable action version | Updated to a valid Trivy action version | Pin and verify external GitHub Actions |
| AKS VM size not allowed | `Standard_B2s` was unavailable for the subscription in UK South | Used an allowed `standard_d2lds_v6` node size | Cloud SKU availability varies by subscription and region |
| Public Ingress initially timed out | Azure LoadBalancer health probe needed correct path | Added `/healthz` health probe annotation to NGINX Ingress service | Cloud load balancers may need provider-specific annotations |
| Existing port-forward returned old backend | Port-forward connection was pinned to an old endpoint | Killed old port-forward and started a fresh one | Port-forward is useful but not always representative of Service re-selection |
| Grafana security concern | Grafana could have been exposed publicly | Kept Grafana internal and used port-forward | Internal dashboards reduce exposure risk |
| Cloud cost risk | AKS, LoadBalancer, public IP, and nodes can keep billing | Deleted final resource group and captured teardown evidence | Teardown is part of responsible cloud engineering |

---

## 13. Security considerations

Security actions taken:

```text
1. Docker runtime image reduced by removing unnecessary npm tooling.
2. Trivy HIGH/CRITICAL scans added.
3. GitHub secrets used for Azure authentication.
4. Azure credential file was not committed.
5. Grafana password evidence was redacted.
6. Grafana was not exposed publicly.
7. Final Azure teardown was completed.
```

---

## 14. Cost-control considerations

The project used paid Azure resources during validation:

```text
Azure Kubernetes Service
Azure Container Registry
Azure LoadBalancer
Public IP
Managed disks and node resources
```

After all validation was complete, the Azure resource group was deleted.

Final confirmation:

```text
az group exists --name rg-ecommerce-bluegreen-dev
false
```

Evidence:

```text
docs/evidence/20-final-teardown/resource-group-exists-after-final-teardown-3.txt
docs/evidence/20-final-teardown/final-azure-teardown-confirmed.txt
```

---

## 15. Limitations and production improvements

This project is a realistic portfolio implementation, but a production environment would require additional work.

| Area | Current project | Production improvement |
|---|---|---|
| Database | Temporary PostgreSQL used for validation | Use Azure Database for PostgreSQL or another managed production database |
| Secrets | Simple validation secrets | Use Azure Key Vault and workload identity |
| TLS | HTTP Ingress validation | Add TLS with cert-manager or Azure Application Gateway |
| Release control | Manual Azure workflow dispatch | Add environment approvals and deployment protection rules |
| Monitoring | Prometheus and Grafana validated | Add persistent storage, alert routing, and notification channels |
| Rollback | Selector rollback validated | Add automated rollback based on SLOs |
| Infrastructure | Some Azure resources created through CLI | Move full Azure infrastructure to Terraform |
| Ingress | NGINX Ingress validated | Add production DNS, TLS, WAF, and rate limiting |

---

## 16. How to run locally

### 16.1 Start local PostgreSQL

```bash
docker run -d \
  --name ecommerce-postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=ecommerce_dev \
  -p 5433:5432 \
  postgres:16-alpine
```

### 16.2 Create server environment file

```bash
cd server

cat > .env <<'EOF'
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/ecommerce_dev"
JWT_SECRET="local-dev-secret-change-later"
PORT=3000
APP_NAME="ecommerce-app"
APP_VERSION="v1.0.0"
APP_ENV="blue"
EOF
```

### 16.3 Install dependencies and run validation

```bash
npm install
npx prisma generate
npx prisma migrate deploy
npm test
npm run build
npm run start:dev
```

### 16.4 Validate endpoints

```bash
curl http://localhost:3000/api/v1/health
curl http://localhost:3000/api/v1/version
curl http://localhost:3000/api/v1/metrics
```

---

## 17. How to run the GitHub Actions workflows

### 17.1 CI workflow

The CI workflow runs automatically on push and pull request.

### 17.2 Minikube workflow

The Minikube workflow runs automatically on push and pull request.

### 17.3 Azure workflow

The Azure workflow is manually triggered to avoid unnecessary Azure cost.

Required GitHub secret:

```text
AZURE_CREDENTIALS
```

The workflow input is:

```text
active_version=blue
```

or:

```text
active_version=green
```

Example:

```bash
gh workflow run "Azure - Blue Green Deploy to AKS" \
  --repo gbadedata/ecommerce-blue-green-aks \
  -f active_version=green
```

---

## 18. Final validated result

The final GitHub Actions Azure workflow succeeded.

The public Ingress endpoint returned:

```json
{
  "app": "ecommerce-app",
  "version": "v2.0.0",
  "environment": "green",
  "status": "ok"
}
```

The public metrics endpoint returned:

```text
ecommerce_app_info{app="ecommerce-app",version="v2.0.0",environment="green"} 1
```

The final Azure teardown returned:

```text
false
```

This means the project was validated and then responsibly cleaned up.

---

## 19. Key learning outcomes

This project strengthened practical understanding of:

```text
1. Blue-Green deployment design
2. Kubernetes Service selector traffic switching
3. Docker runtime hardening
4. GitHub Actions CI/CD design
5. Minikube pre-cloud validation
6. Azure Container Registry and AKS deployment
7. NGINX Ingress and Azure LoadBalancer behaviour
8. Prometheus metrics and Grafana dashboards
9. Alert rule validation
10. Evidence-based DevOps documentation
11. Cloud teardown and cost responsibility
```

---

## 20. Portfolio note

This project was built as a hands-on DevOps portfolio project. It intentionally includes evidence, screenshots, workflow logs, command outputs, validation results, and teardown proof so that the implementation can be reviewed rather than only described.
