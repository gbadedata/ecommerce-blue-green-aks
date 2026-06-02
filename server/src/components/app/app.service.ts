import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Blue-Green Deployment Project</title>

  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: Arial, sans-serif;
      background: #0f172a;
      color: #e2e8f0;
      line-height: 1.7;
    }

    .container {
      max-width: 1100px;
      margin: auto;
      padding: 40px 20px;
    }

    h1 {
      color: #38bdf8;
      margin-bottom: 10px;
      text-align: center;
    }

    h2 {
      color: #38bdf8;
      margin-bottom: 15px;
    }

    .subtitle {
      text-align: center;
      color: #94a3b8;
      margin-bottom: 40px;
    }

    .card {
      background: #1e293b;
      padding: 25px;
      margin-bottom: 25px;
      border-radius: 12px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    }

    ul {
      padding-left: 20px;
    }

    li {
      margin-bottom: 8px;
    }

    .highlight {
      color: #22c55e;
      font-weight: bold;
    }

    .warning {
      color: #fbbf24;
      font-weight: bold;
    }

    .architecture {
      background: #020617;
      border-radius: 10px;
      padding: 20px;
      overflow-x: auto;
      font-family: monospace;
      color: #cbd5e1;
      white-space: pre;
    }

    .dashboard {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 15px;
      margin-top: 15px;
    }

    .stat {
      background: #0f172a;
      padding: 18px;
      border-radius: 10px;
      text-align: center;
    }

    .stat h3 {
      font-size: 14px;
      color: #94a3b8;
      margin-bottom: 10px;
    }

    .stat p {
      font-size: 18px;
      font-weight: bold;
    }

    .success {
      color: #22c55e;
    }

    .info {
      color: #38bdf8;
    }

    .timeline {
      position: relative;
      padding-left: 25px;
      border-left: 2px solid #334155;
      margin-top: 20px;
    }

    .timeline-item {
      position: relative;
      margin-bottom: 30px;
    }

    .dot {
      position: absolute;
      left: -34px;
      top: 4px;
      width: 16px;
      height: 16px;
      border-radius: 50%;
      background: #22c55e;
      border: 3px solid #0f172a;
    }

    .timeline-item h4 {
      margin-bottom: 5px;
      color: #f8fafc;
    }

    .timeline-item p {
      color: #94a3b8;
      font-size: 14px;
    }

    footer {
      text-align: center;
      color: #64748b;
      margin-top: 50px;
      padding-bottom: 20px;
    }
  </style>
</head>

<body>

<div class="container">

  <h1>🔵🟢 Blue-Green Deployment for Zero-Downtime Releases</h1>

  <p class="subtitle">
    Cloud & DevOps Project | Docker • Kubernetes • GitHub Actions • NGINX Ingress • AWS/Azure
  </p>

  <div class="card">
    <h2>📌 Project Overview</h2>

    <p>
      This project demonstrates a production-style deployment pipeline for an
      e-commerce web application using a Blue-Green deployment strategy.
    </p>

    <br>

    <ul>
      <li>Zero-downtime application releases</li>
      <li>Automated CI/CD pipeline</li>
      <li>Containerized deployment using Docker</li>
      <li>Kubernetes orchestration</li>
      <li>Traffic management with NGINX Ingress</li>
      <li>Instant rollback capability</li>
      <li>Cloud-native infrastructure deployment</li>
    </ul>
  </div>

  <div class="card">
    <h2>📊 Deployment Status Dashboard</h2>

    <div class="dashboard">

      <div class="stat">
        <h3>Blue Environment</h3>
        <p class="success">ACTIVE</p>
      </div>

      <div class="stat">
        <h3>Green Environment</h3>
        <p class="info">STANDBY</p>
      </div>

      <div class="stat">
        <h3>Pipeline Status</h3>
        <p class="success">PASSING</p>
      </div>

      <div class="stat">
        <h3>Rollback Ready</h3>
        <p class="success">YES</p>
      </div>

    </div>
  </div>

  <div class="card">
    <h2>🛠️ Technologies Used</h2>

    <ul>
      <li>Frontend: React / Next.js</li>
      <li>Backend: NestJS</li>
      <li>Database: PostgreSQL + Prisma ORM</li>
      <li>Authentication: Better Auth</li>
      <li>Containerization: Docker</li>
      <li>Orchestration: Kubernetes</li>
      <li>CI/CD: GitHub Actions</li>
      <li>Ingress Controller: NGINX Ingress</li>
      <li>Cloud Provider: AWS / Azure</li>
      <li>Container Registry: Docker Hub</li>
    </ul>
  </div>

  <div class="card">
    <h2>🏗️ Architecture</h2>

    <div class="architecture">
Developer
    │
    ▼
GitHub Repository
    │
    ▼
GitHub Actions
    │
    ▼
Build Docker Images
    │
    ▼
Docker Hub
    │
    ▼
Kubernetes Cluster
 ┌─────────────────┐
 │ Blue Environment│
 └─────────────────┘
 ┌─────────────────┐
 │ Green Environment
 └─────────────────┘
    │
    ▼
NGINX Ingress
    │
    ▼
End Users
    </div>
  </div>

  <div class="card">
    <h2>🕒 Blue-Green Deployment Timeline</h2>

    <div class="timeline">

      <div class="timeline-item">
        <div class="dot"></div>
        <h4>Developer Pushes Code</h4>
        <p>Changes are committed and pushed to the GitHub repository.</p>
      </div>

      <div class="timeline-item">
        <div class="dot"></div>
        <h4>GitHub Actions Triggered</h4>
        <p>CI/CD workflow starts automatically.</p>
      </div>

      <div class="timeline-item">
        <div class="dot"></div>
        <h4>Application Build</h4>
        <p>Frontend and backend are compiled and validated.</p>
      </div>

      <div class="timeline-item">
        <div class="dot"></div>
        <h4>Docker Images Created</h4>
        <p>Application components are containerized.</p>
      </div>

      <div class="timeline-item">
        <div class="dot"></div>
        <h4>Images Pushed to Docker Hub</h4>
        <p>Versioned container images are published.</p>
      </div>

      <div class="timeline-item">
        <div class="dot"></div>
        <h4>Green Environment Deployment</h4>
        <p>New release is deployed alongside the live environment.</p>
      </div>

      <div class="timeline-item">
        <div class="dot"></div>
        <h4>Health Checks Executed</h4>
        <p>Readiness and liveness probes validate the deployment.</p>
      </div>

      <div class="timeline-item">
        <div class="dot"></div>
        <h4>Traffic Switch</h4>
        <p>NGINX Ingress routes traffic from Blue to Green.</p>
      </div>

      <div class="timeline-item">
        <div class="dot"></div>
        <h4>Green Becomes Production</h4>
        <p>Users are now served by the new release.</p>
      </div>

      <div class="timeline-item">
        <div class="dot"></div>
        <h4>Blue Retained for Rollback</h4>
        <p>The previous version remains available for rapid recovery.</p>
      </div>

    </div>
  </div>

  <div class="card">
    <h2>🔵🟢 Blue-Green Deployment Strategy</h2>

    <ul>
      <li><strong>Blue Environment</strong> serves live production traffic.</li>
      <li><strong>Green Environment</strong> receives the new application version.</li>
      <li>Traffic is switched only after successful validation.</li>
      <li>Users experience no interruption during releases.</li>
      <li>Both environments exist simultaneously.</li>
    </ul>
  </div>

  <div class="card">
    <h2>❤️ Health Monitoring</h2>

    <ul>
      <li><code>GET /health</code> - Overall application health.</li>
      <li><code>GET /health/readiness</code> - Determines if pods can receive traffic.</li>
      <li><code>GET /health/liveness</code> - Determines if pods should be restarted.</li>
      <li>Kubernetes continuously validates deployment health.</li>
    </ul>
  </div>

  <div class="card">
    <h2>🔁 Rollback Strategy</h2>

    <ul>
      <li>Health checks run after every deployment.</li>
      <li>Traffic remains on Blue until Green is verified.</li>
      <li>Failed releases are isolated immediately.</li>
      <li>Traffic can be switched back to Blue instantly.</li>
      <li>Application availability is maintained throughout deployment.</li>
    </ul>

    <br>

    <p class="warning">
      ✔ Automatic rollback minimizes deployment risk and downtime.
    </p>
  </div>

  <div class="card">
    <h2>👥 Team Collaboration</h2>

    <ul>
      <li>GitHub Organization for centralized collaboration.</li>
      <li>Separate repositories for application and infrastructure.</li>
      <li>Pull Request workflow for code reviews.</li>
      <li>Infrastructure as Code approach.</li>
      <li>Shared responsibility across development and DevOps tasks.</li>
    </ul>
  </div>

  <div class="card">
    <h2>📈 Expected Outcomes</h2>

    <ul>
      <li>Reliable cloud-native deployments.</li>
      <li>Zero-downtime releases.</li>
      <li>Improved deployment confidence.</li>
      <li>Automated CI/CD workflows.</li>
      <li>Fast and safe rollback capabilities.</li>
      <li>Hands-on experience with modern DevOps practices.</li>
    </ul>

    <br>

    <p class="highlight">
      ✔ Demonstrating production-grade deployment practices using Kubernetes and Blue-Green deployment.
    </p>
  </div>

  <footer>
    Cloud Computing & DevOps Project • Blue-Green Deployment Strategy
  </footer>

</div>

</body>
</html>`;
  }
}
