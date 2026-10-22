# Sahayak — DevOps Process and Deployment Documentation

Project: Sahayak — Emergency Resource Finder
Cloud Region: AWS `us-east-1`
Repository: https://github.com/snehalpawar29/sahayak

## 1. Problem Statement

During emergencies, people may need to locate resources such as blood, hospital beds, medicines, ambulances, shelter, food, and water.

Sahayak is a web application that allows citizens to explore listed resources and submit requests. Providers can manage resources and incoming requests, while administrators oversee platform activity.

Note: This is a prototype using demonstration inventory. It is not a verified emergency dispatch service. Resource availability must be confirmed with the relevant provider.

## 2. Application Features

- Citizen, provider, and administrator roles.
- Emergency resource catalogue and request workflow.
- Provider resource management and incoming request views.
- Administrative dashboards and provider verification.
- REST API backed by PostgreSQL.
- Database schema and migrations managed using Prisma.

Supported resource categories include blood, hospital beds, medicine, ambulance, shelter, food, and water.

## 3. Technology Stack

| Component                 | Technology                                  |
| ------------------------- | ------------------------------------------- |
| Frontend                  | React, Vite                                 |
| Backend                   | Node.js, Express                            |
| Database                  | Amazon RDS for PostgreSQL                   |
| ORM and migrations        | Prisma                                      |
| Containerization          | Docker                                      |
| Container registry        | Amazon ECR                                  |
| Deployment                | Elastic Beanstalk Cluster environments      |
| Cluster infrastructure    | Amazon EKS-backed Elastic Beanstalk Cluster |
| Infrastructure as Code    | Terraform                                   |
| Configuration and secrets | AWS Systems Manager Parameter Store         |
| CI/CD                     | GitHub Actions                              |
| AWS authentication        | GitHub OIDC and IAM                         |
| Web server                | Nginx                                       |

## 4. System Architecture

The production application uses separate frontend and backend Elastic Beanstalk Cluster environments.

```
                         Users
                           |
                           v
                 Frontend Environment
                 Sahayak-frontend-env
                           |
                    React / Nginx
                           |
                      /api requests
                           |
                           v
                  Backend Environment
                      Sahayak-env
                           |
                    Express REST API
                           |
                           v
                 Private Amazon RDS
                     PostgreSQL
```

The deployment pipeline operates separately from application traffic:

```
Developer pushes code to GitHub
               |
               v
        GitHub Actions CI
               |
       Frontend and backend
        checks and builds
               |
               v
       Docker images to ECR
               |
               v
        GitHub Actions CD
               |
        +------+------+
        |             |
        v             v
   Deploy backend  Deploy frontend
        |             |
        +------+------+
               |
               v
      Verify deployment health
```

Architecture diagram: `docs/screenshots/Sahayak Emergency Resource Finder Architecture.png`

## 5. Infrastructure Provisioning with Terraform

Terraform manages the networking infrastructure for Sahayak.

The network design includes:

- A dedicated VPC with CIDR `10.20.0.0/16`.
- Public subnets across two Availability Zones.
- Private application subnets across two Availability Zones.
- Private database subnets across two Availability Zones.
- NAT gateways and associated Elastic IP addresses.
- Route tables and subnet associations.

Amazon RDS for PostgreSQL is configured separately and is not publicly accessible. Database ingress should be restricted to the required application security group on the PostgreSQL port.

Separating application and database subnets helps reduce direct exposure and provides a structured network layout.

Terraform plans must be reviewed before applying changes. State files and plan files must be protected and must not be committed to Git.

Terraform configuration: `terraform/networking/`

Detailed deployment guide: `SAHAYAK_DEPLOYMENT_GUIDE.md`

## 6. Database and Secret Management

The production database uses Amazon RDS for PostgreSQL.

- Instance: `sahayak-postgres`
- Database: `sahayak_DB`
- DB subnet group: `sahayak-prod-db-subnets`
- Public accessibility: Disabled
- Migrations: Prisma

Application configuration is managed through AWS Systems Manager Parameter Store under `/sahayak/prod/`.

Parameter names include:

- `DATABASE_URL`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`
- `FRONTEND_URL`
- `PORT`

Production secrets should never be committed to source code, exposed in logs, or included in screenshots. IAM permissions should follow the principle of least privilege.

## 7. Containerization and Amazon ECR

The frontend and backend are packaged as separate Docker images.

Amazon ECR repositories:

- `sahayak-frontend`
- `sahayak-backend`

The CI workflow tags images with the Git commit SHA, making it possible to identify the source revision associated with each image.

The backend container runs Prisma deployment migrations before starting the application.

A successful image build does not, by itself, prove that the deployed service can connect to its database or serve requests.

## 8. Continuous Integration — GitHub Actions

Workflow: `.github/workflows/ci.yaml`

The CI workflow runs on pushes and pull requests according to its configured triggers.

The pipeline includes:

1. Checking out the repository.
2. Setting up Node.js.
3. Installing frontend dependencies.
4. Running frontend lint checks and building the frontend.
5. Installing backend dependencies with CI-only placeholder configuration.
6. Building frontend and backend Docker images without publishing during the validation stage.
7. Publishing images to ECR on pushes to `main`.

GitHub OIDC is used to authenticate with AWS through an IAM role instead of storing long-lived AWS access keys in GitHub repository secrets.

The current backend CI stage installs dependencies; this step alone does not demonstrate that a backend test suite has run.

Evidence: `docs/screenshots/ci-success.png`

## 9. Continuous Deployment — Elastic Beanstalk Cluster

Workflow: `.github/workflows/cd.yaml`

The CD workflow runs after the `Sahayak CI` workflow completes successfully on the `main` branch.

The deployment process is:

1. Confirm that CI succeeded for the intended commit.
2. Authenticate to AWS using GitHub OIDC and the configured IAM role.
3. Verify that both expected image tags exist in ECR.
4. Create a versioned Elastic Beanstalk application version for the backend.
5. Deploy the backend to `Sahayak-env` and wait for the environment update.
6. Create a versioned application version for the frontend.
7. Deploy the frontend to `Sahayak-frontend-env` and wait for the environment update.
8. Inspect environment status and health.

The workflow must use the exact AWS environment names, including capitalization.

Evidence: `docs/screenshots/cd-success.png`

## 10. Deployment Verification

The following results were observed during verification on October 22, 2026. These are point-in-time results and do not guarantee future availability.

| Verification                      | Observed result                      |
| --------------------------------- | ------------------------------------ |
| Backend environment               | `Ready`, health `Green`              |
| Frontend environment              | `Ready`, health `Green`              |
| Backend `/api/health` endpoint    | HTTP 200, healthy response           |
| Backend `/api/resources` endpoint | HTTP 200, 51 demonstration records   |
| Frontend homepage                 | HTTP 200                             |
| RDS instance                      | `available`, not publicly accessible |
| Terraform validation              | Passed                               |

Example read-only smoke tests:

```
curl -i --max-time 15 
  https://sahayak-backend.us-east-1.elasticbeanstalk.com/api/health

curl -i --max-time 15 
  https://sahayak-backend.us-east-1.elasticbeanstalk.com/api/resources

curl -I --max-time 15 
  https://Sahayak-frontend-env.eba-hfgytpmy.us-east-1.elasticbeanstalk.com/
```

Before recording a new demonstration, recheck the current AWS environment health. Do not expose credentials, JWTs, database connection strings, or secret parameter values.

## 11. Screenshots and Evidence

### Application Screenshots

- `docs/screenshots/01-homepage.png`
- `docs/screenshots/02-resource-catalogue.png`
- `docs/screenshots/03-resource-request-form.png`
- `docs/screenshots/04-my-requests.png`
- `docs/screenshots/05-provider-dashboard.png`
- `docs/screenshots/06-admin-dashboard.png`

### Infrastructure and CI/CD Evidence

- `docs/screenshots/Sahayak Emergency Resource Finder Architecture.png`
- `docs/screenshots/vpc.png`
- `docs/screenshots/Database.png`
- `docs/screenshots/ci-success.png`
- `docs/screenshots/cd-success.png`

Screenshots should support the demonstration and must not expose secrets or sensitive personal information.

## 12. Troubleshooting Approach

Deployment troubleshooting involved application configuration, database connectivity, container health, IAM permissions, and Elastic Beanstalk environment readiness.

A repeatable troubleshooting process is:

1. Inspect GitHub Actions logs and confirm the commit SHA being deployed.
2. Verify that the expected image tags exist in ECR.
3. Inspect Elastic Beanstalk environment status and recent events.
4. Review container startup and application logs.
5. Check backend connectivity to the private RDS endpoint.
6. Review security groups, subnet routing, IAM permissions, and parameter names.
7. Run health checks after deployment.

A successful build does not, by itself, prove that the production application is ready.

## 13. Security and Cost Considerations

- Keep RDS private and restrict database access to the required application security group.
- Use least-privilege IAM policies and OIDC for GitHub Actions.
- Store production secrets in Parameter Store.
- Protect Terraform state and review plans before infrastructure changes.
- Monitor costs associated with NAT gateways, Elastic IP addresses, RDS, and cluster resources.
- Review the exact infrastructure changes before deleting resources.

## 14. Future Improvements

- Add backend unit and integration tests.
- Add API contract tests and frontend end-to-end tests.
- Implement explicit post-deployment smoke tests and rollback procedures.
- Improve centralized logging, metrics, dashboards, and alerting.
- Strengthen input validation, rate limiting, and security testing.
- Integrate verified providers and real availability workflows before any real-world emergency use.
- Improve accessibility and mobile usability.
- Document database backup and recovery procedures.

## 15. Learning and Potential Impact

Building Sahayak provided practical experience with containerization, Infrastructure as Code, cloud networking, database connectivity, IAM, and automated CI/CD.

The project demonstrates how separate frontend and backend deployments, versioned container images, private database networking, and health checks can contribute to a repeatable delivery workflow. It also highlights why deployment health and database connectivity must be verified instead of relying solely on successful builds.

Sahayak is a demonstration prototype. Its potential impact is to illustrate how emergency resource discovery and request coordination might be organized. Real-world use would require verified inventory, provider participation, operational monitoring, and appropriate reliability and safety controls.
