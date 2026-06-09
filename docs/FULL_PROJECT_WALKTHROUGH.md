# Local-to-Cloud Blue-Green Deployment Walkthrough

This walkthrough explains the full project from source code to GitHub Actions, Minikube, Azure Container Registry, Azure Kubernetes Service, NGINX Ingress, Prometheus, Grafana, alerting, and teardown.

It is written for a beginner. Each stage explains what is being done, why it matters, when to do it, where it happens, the implication, and the advantage.

---

## Architecture this walkthrough follows

```text
GitHub Source Code
→ GitHub Actions CI/CD Pipeline
→ Build Docker Image
→ Test on Minikube
→ Push to Azure Container Registry
→ Deploy to Azure Kubernetes Service
→ NGINX Ingress Controller
→ One ClusterIP Service
→ Blue Pods v1.0.0 and Green Pods v2.0.0
→ Prometheus
→ Grafana Dashboard and Alert
→ Final Azure Teardown
```

The most important design rule in this project is:

```text
Traffic must switch by patching the Kubernetes Service selector.
Traffic must not switch by changing the Ingress backend.
```

The Service selector changes from:

```yaml
version: blue
```

to:

```yaml
version: green
```

---

## Stage 0: Project goal

### What

Deploy an ecommerce NestJS API using Blue-Green deployment.

### Why

Blue-Green deployment reduces release risk because the new version can be deployed beside the old version before traffic is switched.

### When

Use this strategy when downtime must be avoided and rollback needs to be fast.

### Where

This project validates Blue-Green deployment in:

```text
1. Docker locally
2. Minikube locally
3. Azure Kubernetes Service
4. GitHub Actions
```

### Implication

There are always two application versions available during release validation.

### Advantage

Rollback is fast because traffic can be moved back to Blue by patching one Kubernetes Service.

---

## Stage 1: Prepare the repository

### 1.1 Clone the source repository

```bash
git clone https://github.com/TechCrush-Cloud-Computing-Group-10/ecommerce-app.git
cd ecommerce-app
```

### What

This downloads the application source code.

### Why

GitHub is the source of truth for the project.

### Where

Run this in your local projects folder, for example:

```bash
~/projects/ecommerce-app
```

### Evidence to capture

```bash
pwd
git remote -v
git status --short
```

Save output under:

```text
docs/evidence/01-repo
```

---

## Stage 2: Understand the application

The application is a NestJS backend with Prisma and PostgreSQL.

Important endpoints:

```text
/api/v1/health
/api/v1/health/readiness
/api/v1/health/liveness
/api/v1/version
/api/v1/metrics
```

### Why these endpoints matter

| Endpoint | Purpose |
|---|---|
| `/health` | Confirms the app is running |
| `/readiness` | Confirms the app can receive traffic |
| `/liveness` | Confirms Kubernetes should keep the container alive |
| `/version` | Shows whether Blue or Green is active |
| `/metrics` | Exposes Prometheus metrics |

---

## Stage 3: Create evidence folders

Run:

```bash
mkdir -p docs/evidence/{00-clean-start,01-repo,02-local-app,03-tests-build,04-docker,05-trivy,06-minikube,07-blue-green,08-zero-downtime,09-monitoring,10-azure-preflight,11-acr,12-aks,13-final,14-aks-cloud-monitoring,15-github-actions,16-github-actions-azure-deploy,17-grafana-dashboard-alert,19-github-actions-ingress,20-final-teardown}
```

### What

This creates folders to store proof.

### Why

A portfolio project is stronger when it includes evidence, not just claims.

### Advantage

Recruiters, reviewers, and teammates can follow what was actually tested.

---

## Stage 4: Run PostgreSQL locally

### 4.1 Start a dedicated PostgreSQL container

```bash
docker run -d \
  --name ecommerce-postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=ecommerce_dev \
  -p 5433:5432 \
  postgres:16-alpine
```

### What

This starts PostgreSQL in Docker.

### Why

The local PostgreSQL on port 5432 may already exist or reject the expected credentials.

### When

Do this before running the NestJS app locally.

### Where

This runs on your local machine.

### Implication

Your project database is isolated from other PostgreSQL installations.

### Advantage

It makes the project easier to reproduce.

### Evidence

```bash
docker ps | grep ecommerce-postgres | tee docs/evidence/02-local-app/postgres-container.txt
```

---

## Stage 5: Configure local environment

Inside the `server` folder:

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

### What

This creates local environment variables.

### Why

The application needs a database connection and version metadata.

### Security note

Do not commit real secrets. This value is only for local validation.

---

## Stage 6: Install dependencies and validate the app

```bash
npm install
npx prisma generate
npx prisma migrate deploy
npm test
npm run build
```

### What

This installs dependencies, prepares Prisma, runs tests, and builds the app.

### Why

Do not containerise or deploy an app that does not pass local validation.

### Evidence

```bash
npm test | tee ../docs/evidence/03-tests-build/npm-test.txt
npm run build | tee ../docs/evidence/03-tests-build/npm-build.txt
```

---

## Stage 7: Add the version endpoint

The version endpoint should return the active version and environment.

Expected response:

```json
{
  "app": "ecommerce-app",
  "version": "v1.0.0",
  "environment": "blue",
  "status": "ok"
}
```

### What

It exposes the running version.

### Why

Blue-Green deployment needs visible proof of which version is receiving traffic.

### When

Add this before Docker and Kubernetes validation.

### Where

Inside the NestJS backend.

### Advantage

It makes release switching easy to verify.

---

## Stage 8: Add the metrics endpoint

The metrics endpoint should expose Prometheus metrics.

Expected output:

```text
ecommerce_app_info{app="ecommerce-app",version="v1.0.0",environment="blue"} 1
```

### What

It exposes app metadata as Prometheus metrics.

### Why

Monitoring should show which version is active.

### When

Add this before Prometheus validation.

### Where

Inside the NestJS backend.

### Advantage

Grafana can display the active Blue or Green version.

---

## Stage 9: Build Docker images

From the repository root:

```bash
docker build \
  -f server/Dockerfile \
  -t ecommerce-app:v1.0.0-blue \
  --build-arg APP_VERSION=v1.0.0 \
  --build-arg APP_ENV=blue \
  server

docker build \
  -f server/Dockerfile \
  -t ecommerce-app:v2.0.0-green \
  --build-arg APP_VERSION=v2.0.0 \
  --build-arg APP_ENV=green \
  server
```

### What

This builds two different application images.

### Why

Blue and Green must be separate deployable versions.

### Evidence

```bash
docker images | grep ecommerce-app | tee docs/evidence/04-docker/docker-images.txt
```

---

## Stage 10: Run Docker containers locally

### 10.1 Run Blue

```bash
docker run --rm -d \
  --name ecommerce-blue \
  --add-host=host.docker.internal:host-gateway \
  -e DATABASE_URL="postgresql://postgres:postgres@host.docker.internal:5433/ecommerce_dev" \
  -e JWT_SECRET="local-dev-secret-change-later" \
  -e PORT=3000 \
  -p 3000:3000 \
  ecommerce-app:v1.0.0-blue
```

Validate:

```bash
curl http://localhost:3000/api/v1/version
curl http://localhost:3000/api/v1/metrics
```

### 10.2 Run Green

Stop Blue first if port 3000 is already used:

```bash
docker stop ecommerce-blue
```

Run Green:

```bash
docker run --rm -d \
  --name ecommerce-green \
  --add-host=host.docker.internal:host-gateway \
  -e DATABASE_URL="postgresql://postgres:postgres@host.docker.internal:5433/ecommerce_dev" \
  -e JWT_SECRET="local-dev-secret-change-later" \
  -e PORT=3000 \
  -p 3000:3000 \
  ecommerce-app:v2.0.0-green
```

Validate:

```bash
curl http://localhost:3000/api/v1/version
curl http://localhost:3000/api/v1/metrics
```

### Why this matters

This proves both images work before Kubernetes is involved.

---

## Stage 11: Scan images with Trivy

```bash
trivy image \
  --severity HIGH,CRITICAL \
  --exit-code 1 \
  ecommerce-app:v1.0.0-blue

trivy image \
  --severity HIGH,CRITICAL \
  --exit-code 1 \
  ecommerce-app:v2.0.0-green
```

### What

This scans Docker images for HIGH and CRITICAL vulnerabilities.

### Why

A deployment pipeline should stop unsafe images before they reach the cluster.

### Challenge encountered

Trivy initially detected a HIGH vulnerability from npm tooling inside the runtime image.

### Resolution

Remove npm, npx, and corepack from the runtime image:

```dockerfile
RUN rm -rf /usr/local/lib/node_modules/npm \
    /usr/local/bin/npm \
    /usr/local/bin/npx \
    /usr/local/bin/corepack
```

### Implication

The runtime container contains fewer unnecessary tools.

### Advantage

Reduced attack surface and successful vulnerability gate.

---

## Stage 12: Deploy to Minikube

### 12.1 Start Minikube

```bash
minikube start
kubectl config use-context minikube
```

### 12.2 Load images into Minikube

```bash
minikube image load ecommerce-app:v1.0.0-blue
minikube image load ecommerce-app:v2.0.0-green
```

### 12.3 Apply Kubernetes manifests

```bash
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/blue-deployment.yaml
kubectl apply -f k8s/green-deployment.yaml
kubectl apply -f k8s/service.yaml
kubectl apply -f k8s/ingress.yaml
```

### 12.4 Check pods and service

```bash
kubectl get pods -n ecommerce-bluegreen -o wide
kubectl get svc -n ecommerce-bluegreen -o wide
kubectl get ingress -n ecommerce-bluegreen -o wide
```

### What

This deploys Blue and Green locally.

### Why

Minikube validates Kubernetes logic before cloud cost is introduced.

### Advantage

Problems are cheaper and faster to fix locally.

---

## Stage 13: Switch traffic in Minikube

### 13.1 Switch to Green

```bash
kubectl patch service ecommerce-service \
  -n ecommerce-bluegreen \
  -p '{"spec":{"selector":{"app":"ecommerce","version":"green"}}}'
```

### 13.2 Switch back to Blue

```bash
kubectl patch service ecommerce-service \
  -n ecommerce-bluegreen \
  -p '{"spec":{"selector":{"app":"ecommerce","version":"blue"}}}'
```

### What

This changes which pods receive traffic.

### Why

This is the core Blue-Green mechanism.

### Where

The change happens in the Kubernetes Service selector.

### Implication

The Ingress route stays the same.

### Advantage

Rollback is simple and fast.

---

## Stage 14: Validate zero-downtime switching

Run the zero-downtime test script:

```bash
bash scripts/zero-downtime-test.sh
```

Expected result:

```text
Failed requests: 0
```

### What

This sends repeated requests while traffic is switched.

### Why

A Blue-Green deployment should avoid failed requests during a switch.

### Evidence

```text
docs/evidence/08-zero-downtime
```

---

## Stage 15: Install local monitoring

Install kube-prometheus-stack:

```bash
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update

helm upgrade --install kube-prometheus-stack prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --create-namespace
```

Apply ServiceMonitor:

```bash
kubectl apply -f k8s/ecommerce-servicemonitor.yaml
```

Check Prometheus:

```bash
kubectl port-forward -n monitoring svc/kube-prometheus-stack-prometheus 9090:9090
```

In another terminal:

```bash
curl -sG http://localhost:9090/api/v1/query \
  --data-urlencode 'query=ecommerce_app_info'
```

### What

This validates that Prometheus can scrape the ecommerce app.

### Why

Monitoring is part of the deployment architecture.

---

## Stage 16: Prepare Azure

Set project variables:

```bash
export RESOURCE_GROUP="rg-ecommerce-bluegreen-dev"
export LOCATION="uksouth"
export ACR_NAME="acrecommercebg8070"
export AKS_NAME="aks-ecommerce-bluegreen-dev"
```

Login and check account:

```bash
az login
az account show
```

Create resource group:

```bash
az group create \
  --name "$RESOURCE_GROUP" \
  --location "$LOCATION"
```

### What

This prepares Azure for the cloud deployment.

### Why

AKS and ACR need a resource group.

### Cost note

AKS, public IP, disks, and LoadBalancer can create cost. Teardown is required after validation.

---

## Stage 17: Create Azure Container Registry

```bash
az acr create \
  --resource-group "$RESOURCE_GROUP" \
  --name "$ACR_NAME" \
  --sku Basic
```

Get login server:

```bash
export ACR_LOGIN_SERVER=$(az acr show \
  --name "$ACR_NAME" \
  --query loginServer \
  --output tsv)
```

Login:

```bash
az acr login --name "$ACR_NAME"
```

### What

This creates a private container registry.

### Why

AKS needs somewhere to pull the Docker images from.

---

## Stage 18: Push images to ACR

Tag images:

```bash
docker tag ecommerce-app:v1.0.0-blue "$ACR_LOGIN_SERVER/ecommerce-app:v1.0.0-blue"
docker tag ecommerce-app:v2.0.0-green "$ACR_LOGIN_SERVER/ecommerce-app:v2.0.0-green"
```

Push images:

```bash
docker push "$ACR_LOGIN_SERVER/ecommerce-app:v1.0.0-blue"
docker push "$ACR_LOGIN_SERVER/ecommerce-app:v2.0.0-green"
```

Check tags:

```bash
az acr repository show-tags \
  --name "$ACR_NAME" \
  --repository ecommerce-app \
  --output table
```

### What

This uploads Blue and Green images to Azure.

### Why

AKS cannot use local Docker images. It pulls images from ACR.

---

## Stage 19: Create AKS

```bash
az aks create \
  --resource-group "$RESOURCE_GROUP" \
  --name "$AKS_NAME" \
  --node-count 2 \
  --node-vm-size standard_d2lds_v6 \
  --attach-acr "$ACR_NAME" \
  --generate-ssh-keys
```

Get credentials:

```bash
az aks get-credentials \
  --resource-group "$RESOURCE_GROUP" \
  --name "$AKS_NAME" \
  --overwrite-existing
```

Check nodes:

```bash
kubectl get nodes -o wide
```

### Challenge encountered

`Standard_B2s` was not allowed in the selected subscription and region.

### Resolution

An allowed node size was used:

```text
standard_d2lds_v6
```

### Lesson

Azure VM SKU availability depends on subscription and region.

---

## Stage 20: Deploy to AKS

Apply manifests:

```bash
kubectl apply -f k8s/aks/namespace.yaml
kubectl apply -f k8s/aks/postgres.yaml
kubectl apply -f k8s/aks/blue-deployment.yaml
kubectl apply -f k8s/aks/green-deployment.yaml
kubectl apply -f k8s/aks/service.yaml
```

Wait:

```bash
kubectl rollout status deployment/ecommerce-blue -n ecommerce-bluegreen --timeout=300s
kubectl rollout status deployment/ecommerce-green -n ecommerce-bluegreen --timeout=300s
```

Check:

```bash
kubectl get pods -n ecommerce-bluegreen -o wide
kubectl get svc -n ecommerce-bluegreen -o wide
```

### Note about PostgreSQL

This project used temporary in-cluster PostgreSQL only for deployment validation.

Production should use a managed database such as Azure Database for PostgreSQL.

---

## Stage 21: Switch AKS traffic

Switch to Green:

```bash
kubectl patch service ecommerce-service \
  -n ecommerce-bluegreen \
  -p '{"spec":{"selector":{"app":"ecommerce","version":"green"}}}'
```

Check endpoints:

```bash
kubectl get endpoints ecommerce-service -n ecommerce-bluegreen -o wide
```

Validate internally:

```bash
kubectl port-forward -n ecommerce-bluegreen svc/ecommerce-service 8081:80
```

In another terminal:

```bash
curl http://localhost:8081/api/v1/version
curl http://localhost:8081/api/v1/metrics
```

Expected:

```text
version: v2.0.0
environment: green
```

---

## Stage 22: Install NGINX Ingress on AKS

```bash
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm repo update

helm upgrade --install ingress-nginx ingress-nginx/ingress-nginx \
  --namespace ingress-nginx \
  --create-namespace \
  --set controller.replicaCount=2 \
  --set-string controller.service.annotations."service\.beta\.kubernetes\.io/azure-load-balancer-health-probe-request-path"=/healthz
```

Wait:

```bash
kubectl rollout status deployment/ingress-nginx-controller \
  -n ingress-nginx \
  --timeout=300s
```

### Why the health probe annotation matters

Azure LoadBalancer needs a healthy backend probe. The `/healthz` path allows Azure to check the NGINX Ingress Controller correctly.

### Challenge encountered

The public endpoint initially timed out.

### Resolution

The Azure LoadBalancer health probe annotation was added.

---

## Stage 23: Apply public Ingress

```bash
kubectl apply -f k8s/aks/ingress.yaml
```

Check:

```bash
kubectl get ingress ecommerce-ingress -n ecommerce-bluegreen -o wide
kubectl get svc ingress-nginx-controller -n ingress-nginx -o wide
```

Get public IP:

```bash
export AKS_INGRESS_IP=$(kubectl get svc ingress-nginx-controller \
  -n ingress-nginx \
  -o jsonpath='{.status.loadBalancer.ingress[0].ip}')

echo "$AKS_INGRESS_IP"
```

Validate:

```bash
curl -H "Host: ecommerce-aks.local" \
  "http://$AKS_INGRESS_IP/api/v1/version"

curl -H "Host: ecommerce-aks.local" \
  "http://$AKS_INGRESS_IP/api/v1/metrics"
```

Expected:

```text
version: v2.0.0
environment: green
ecommerce_app_info
```

---

## Stage 24: GitHub Actions CI workflow

The CI workflow validates code quality and image security.

It performs:

```text
install dependencies
run tests
build NestJS application
build Docker image
run Trivy scan
```

### Why

This prevents untested or vulnerable changes from progressing.

### Evidence

```text
docs/evidence/15-github-actions/github-actions-ci-push-success.png
```

---

## Stage 25: GitHub Actions Minikube workflow

The Minikube workflow validates Kubernetes Blue-Green logic.

It performs:

```text
create Minikube
deploy Blue and Green
switch Service selector
validate active version
```

### Why

This proves the deployment strategy before AKS.

### Evidence

```text
docs/evidence/15-github-actions/github-actions-minikube-push-success.png
```

---

## Stage 26: GitHub Actions Azure workflow

The Azure workflow validates the full cloud architecture.

It performs:

```text
build Blue and Green images
scan images
push images to ACR
deploy to AKS
switch Service selector
install NGINX Ingress
apply public Ingress
validate public version endpoint
validate public metrics endpoint
```

Trigger:

```bash
gh workflow run "Azure - Blue Green Deploy to AKS" \
  --repo gbadedata/ecommerce-blue-green-aks \
  -f active_version=green
```

Watch:

```bash
gh run watch RUN_ID \
  --repo gbadedata/ecommerce-blue-green-aks
```

### Why manual trigger

Cloud deployment is manually triggered to avoid creating cost on every push.

### Evidence

```text
docs/evidence/16-github-actions-azure-deploy
docs/evidence/19-github-actions-ingress
```

---

## Stage 27: Install Prometheus and Grafana on AKS

```bash
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update

helm upgrade --install kube-prometheus-stack prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --create-namespace
```

Apply ServiceMonitor:

```bash
kubectl apply -f k8s/aks/ecommerce-servicemonitor.yaml
```

Query metric:

```bash
kubectl port-forward -n monitoring svc/kube-prometheus-stack-prometheus 9090:9090
```

In another terminal:

```bash
curl -sG "http://localhost:9090/api/v1/query" \
  --data-urlencode 'query=ecommerce_app_info'
```

Expected:

```text
version="v2.0.0"
environment="green"
```

---

## Stage 28: Create Prometheus alert rule

Apply rule:

```bash
kubectl apply -f k8s/aks/ecommerce-prometheusrule.yaml
```

Check rule:

```bash
curl -s "http://localhost:9090/api/v1/rules" \
  | grep -o '"name":"EcommerceAppInfoMissing"'
```

Expected:

```text
"name":"EcommerceAppInfoMissing"
```

### What the alert does

It detects when the application metric disappears.

### Why this matters

A pod can be alive but still fail to expose the expected application metric.

### Expected healthy result

The alert should exist but not fire while the app is healthy.

---

## Stage 29: Create Grafana dashboard

Port-forward Grafana:

```bash
kubectl port-forward -n monitoring svc/kube-prometheus-stack-grafana 3001:80
```

Open:

```text
http://localhost:3001
```

Dashboard used:

```text
Ecommerce Blue-Green Deployment Overview
```

Panels:

```text
Active Ecommerce Version
Ecommerce Pods Scraped by Prometheus
Node.js Event Loop Lag
```

### Why Grafana was not public

Grafana was kept internal to reduce exposure risk.

### Evidence

```text
docs/evidence/17-grafana-dashboard-alert/grafana-dashboard-browser-view.png
docs/evidence/17-grafana-dashboard-alert/grafana-dashboard-export.json
```

---

## Stage 30: Final architecture validation checklist

Before teardown, confirm:

```text
GitHub source code exists
CI workflow succeeded
Minikube workflow succeeded
Azure workflow succeeded
Images were pushed to ACR
AKS deployed Blue and Green
Service selector points to Green
NGINX Ingress Controller is installed
Azure public LoadBalancer exists
Public Ingress returns v2.0.0 green
Public metrics returns ecommerce_app_info
Prometheus sees ecommerce_app_info
Grafana dashboard exists
Alert rule EcommerceAppInfoMissing exists
Azure resources are ready for teardown
```

---

## Stage 31: Final Azure teardown

Delete the resource group:

```bash
az group delete \
  --name "$RESOURCE_GROUP" \
  --yes \
  --no-wait
```

Wait:

```bash
sleep 120
```

Check:

```bash
az group exists \
  --name "$RESOURCE_GROUP"
```

Expected:

```text
false
```

Save evidence:

```bash
az group exists \
  --name "$RESOURCE_GROUP" \
  | tee docs/evidence/20-final-teardown/resource-group-exists-after-final-teardown-3.txt

az group list \
  --query "[?contains(name, 'MC_') || contains(name, 'ecommerce') || contains(name, 'bluegreen')].[name,location]" \
  --output table \
  | tee docs/evidence/20-final-teardown/related-resource-groups-after-final-teardown.txt
```

### What

This deletes the Azure project resources.

### Why

AKS and LoadBalancer resources can continue to cost money.

### Implication

The live cloud environment is removed.

### Advantage

The project remains documented without leaving paid resources running.

---

## Stage 32: Commit final documentation and evidence

```bash
git status --short
git add README.md docs/FULL_PROJECT_WALKTHROUGH.md docs/evidence
git commit -m "Add final README walkthrough and evidence"
git push portfolio main
```

---

## Final result

The final project proves:

```text
GitHub
→ GitHub Actions
→ Docker build and scan
→ Minikube validation
→ ACR push
→ AKS deployment
→ NGINX public Ingress
→ Blue-Green Service selector switching
→ Prometheus metrics
→ Grafana dashboard
→ Alert rule
→ Teardown
```

The last active release was:

```text
version: v2.0.0
environment: green
```

The final Azure resource group status was:

```text
false
```

This means the deployment was validated and the cloud resources were responsibly removed.
