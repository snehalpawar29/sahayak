# Sahayak — Complete AWS Deployment Guide 🚑

**Terraform Networking | Amazon RDS PostgreSQL | Elastic Beanstalk Cluster | IAM | GitHub Actions CI/CD**

GitHub repository: https://github.com/snehalpawar29/sahayak

## Architecture

- **VPC:** Terraform
- **Database:** Amazon RDS for PostgreSQL, created through the AWS Console
- **Container registry:** Amazon ECR
- **Compute and deployment:** Elastic Beanstalk Cluster, powered by Amazon EKS
- **Secrets:** AWS Systems Manager Parameter Store
- **CI/CD:** GitHub Actions with AWS IAM OIDC
- **Region:** `us-east-1` — US East (N. Virginia)

## Complete deployment sequence

1. Clone the repository.
2. Create the VPC and networking using Terraform.
3. Create the PostgreSQL database manually through the AWS Console.
4. Create and configure the four IAM roles.
5. Create the backend Elastic Beanstalk Cluster environment.
6. Add the backend Cluster security group to the RDS security group's inbound rules.
7. Create the Parameter Store parameters.
8. Create the frontend Cluster environment.
9. Configure backend secrets and frontend Nginx.
10. Configure GitHub Actions and deploy both images.
11. Test the live application.

> **Before starting:** These steps assume a fresh deployment. If you already have Sahayak resources, inspect and reuse them instead of creating duplicates. A fresh Git clone does not contain your previous local Terraform state. Do not apply a new Terraform state to existing infrastructure without first recovering or importing the original state.

---

# Phase 1 — Clone the repository

Open a terminal on your computer, CloudShell, or your development machine.

```bash
git clone https://github.com/snehalpawar29/sahayak.git
cd sahayak
```

Verify the project structure:

```bash
ls
```

You should see directories and files including:

```text
backend/
frontend/
terraform/
.github/
deployment/
SAHAYAK_DEPLOYMENT_GUIDE.md
```

## Step 1.1 — Verify AWS access

```bash
aws --version
terraform version
aws sts get-caller-identity
```

Set the AWS region:

```bash
aws configure set region us-east-1
aws configure get region
```

Check that you are using the intended AWS account. This guide uses account `033161567802`; replace this account ID in the IAM policy ARNs and GitHub Actions configuration when deploying in another account.

---

# Phase 2 — Create the VPC using Terraform

The networking Terraform configuration is located in:

```text
terraform/networking/
```

It creates the VPC, public and private subnets, Internet Gateway, NAT Gateways, route tables, security groups, and RDS subnet group.

**This phase does not create the PostgreSQL RDS database instance.**

## Step 2.1 — Initialise Terraform

```bash
cd terraform/networking
terraform init
terraform validate
```

Resolve any validation errors before proceeding.

## Step 2.2 — Review and apply the Terraform plan

Create the plan:

```bash
terraform plan -out=networking.tfplan
```

Review the planned changes:

```bash
terraform show -no-color networking.tfplan
```

For a fresh deployment, confirm that the plan creates the intended resources and does not destroy or replace resources you need.

Apply the reviewed plan:

```bash
terraform apply networking.tfplan
```

Wait for Terraform to finish successfully.

**Do not run `terraform destroy` to fix networking issues.** Keep Terraform state and plan files private and out of Git.

## Step 2.3 — Understand the network layout

The networking configuration defines these subnets in the `10.20.0.0/16` VPC.

| Subnet | CIDR | Purpose |
|---|---|---|
| `sahayak-public-1a` | `10.20.1.0/24` | Public load balancer |
| `sahayak-public-1b` | `10.20.2.0/24` | Public load balancer |
| `sahayak-app-private-1a` | `10.20.11.0/24` | Application Cluster |
| `sahayak-app-private-1b` | `10.20.12.0/24` | Application Cluster |
| `sahayak-db-private-1a` | `10.20.21.0/24` | Private database |
| `sahayak-db-private-1b` | `10.20.22.0/24` | Private database |

The application subnets use NAT Gateways for outbound internet access. The database subnets remain private.

Elastic Beanstalk Cluster environments require compatible subnets in at least two Availability Zones. For this setup, both application environments must use the **same two private application subnets** so that they can share the same EKS cluster. The load balancer uses the corresponding public subnets.

## Step 2.4 — Record the Terraform outputs

Run:

```bash
terraform output
```

Record the VPC ID:

```bash
terraform output -raw vpc_id
```

Record the subnet IDs:

```bash
terraform output -json public_subnet_ids
terraform output -json app_private_subnet_ids
terraform output -json db_private_subnet_ids
```

Also record the security-group IDs and RDS subnet group name:

```bash
terraform output -json security_group_ids
terraform output -raw rds_subnet_group_name
```

You will need these values when creating RDS and the Elastic Beanstalk environments.

## Step 2.5 — Confirm the networking resources

In the AWS Console, open **VPC** and confirm that:

- `sahayak-prod-vpc` exists.
- The six subnets exist in `us-east-1a` and `us-east-1b`.
- The public subnets route through the Internet Gateway.
- The private application subnets route through NAT Gateways.
- The database subnet group is named `sahayak-prod-db-subnets`.
- The security groups include `sahayak-alb-sg`, `sahayak-app-sg`, and `sahayak-rds-sg`.

NAT Gateways, Elastic IP addresses, load balancers, RDS, and EKS resources can incur charges. Review the current AWS cost estimates before continuing.

---

# Phase 3 — Create PostgreSQL RDS manually

Create the **database instance through the AWS Console**. Do not add an RDS instance resource to the networking Terraform configuration for this procedure.

## Step 3.1 — Open RDS

1. Open the [AWS RDS Console](https://console.aws.amazon.com/rds/).
2. Select the region **US East (N. Virginia) — `us-east-1`**.
3. Open **Databases**.
4. Click **Create database**.
5. Select **Standard create**.
6. Select **PostgreSQL** as the engine.

Choose a PostgreSQL version supported by your application and offered in the selected region.

## Step 3.2 — Configure the database

Use the following selections.

| Setting | Value |
|---|---|
| Database creation method | Standard create |
| Engine | PostgreSQL |
| DB instance identifier | `sahayak-postgres` |
| Initial database name | `sahayak_DB` |
| Master username | `sahayak_admin` |
| Master password | A strong, unique password |
| Instance class | `db.t3.micro`, if available and suitable |
| Storage | Start with 20 GiB, if supported |
| Storage type | General Purpose SSD (`gp3`), if available |
| Storage encryption | Enabled |
| Deployment | Single-AZ for a cost-conscious demo |
| Automated backups | Enable a retention period appropriate for your data |
| Deletion protection | Enable it when available |

Choose a Free Tier option only if your account and selected configuration qualify. Otherwise, choose a suitable Dev/Test configuration and review the current cost estimates. Instance-class availability and prices may change.

Generate a strong password, for example:

```bash
openssl rand -hex 24
```

Save the password in a password manager. Do not commit or publish it.

## Step 3.3 — Configure RDS connectivity

This is a critical step. **RDS must be created in the same VPC as the Sahayak application Cluster.**

Under Connectivity, select:

| Setting | Value |
|---|---|
| VPC | `sahayak-prod-vpc` — the VPC created in Phase 2 |
| DB subnet group | `sahayak-prod-db-subnets` |
| Public access | **No** |
| VPC security group | Select existing `sahayak-rds-sg` |
| Database port | `5432` |

If the console has a setting for creating a new security group, do not create a duplicate by mistake. Select the existing Terraform-created `sahayak-rds-sg`.

Keep the database private. Do not allow PostgreSQL from `0.0.0.0/0`.

Leave optional paid features disabled unless you need them. Review backup, monitoring, storage, and availability settings before creating the database.

Click **Create database**.

## Step 3.4 — Wait for RDS to become available

Wait until the database status becomes **Available**.

Open the database details and record:

- DB instance identifier: `sahayak-postgres`
- Initial database name: `sahayak_DB`
- Endpoint hostname
- Port: `5432`
- VPC ID
- Security group: `sahayak-rds-sg`

The endpoint will resemble:

```text
sahayak-postgres.xxxxxxxxxxxx.us-east-1.rds.amazonaws.com
```

Use your actual endpoint, not this example.

Confirm the database is private and in the VPC created by Terraform.

---

# Phase 4 — Create the four IAM roles

Open the [IAM Console](https://console.aws.amazon.com/iam/) and select **Roles → Create role**.

For each role, select **Custom trust policy** and enter the trust policy shown below, then attach the listed permissions.

If a role already exists, verify its trust policy and permissions rather than creating a duplicate. The three core Cluster roles must be consistent across environments that use the same Cluster subnets.

## Role 1 — `aws-elasticbeanstalk-eks-cluster-role`

**Trusted service:** `eks.amazonaws.com`

Trust policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "eks.amazonaws.com"
      },
      "Action": [
        "sts:AssumeRole",
        "sts:TagSession"
      ]
    }
  ]
}
```

Attach these six AWS-managed policies:

1. `AmazonEKSBlockStoragePolicy`
2. `AmazonEKSClusterPolicy`
3. `AmazonEKSComputePolicy`
4. `AmazonEKSLoadBalancingPolicy`
5. `AmazonEKSNetworkingPolicy`
6. `AWSElasticBeanstalkEKSTagging`

Create the role with the exact name:

```text
aws-elasticbeanstalk-eks-cluster-role
```

## Role 2 — `aws-elasticbeanstalk-eks-node-role`

**Trusted service:** `ec2.amazonaws.com`

Trust policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "ec2.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
```

Attach these three AWS-managed policies:

1. `AmazonEC2ContainerRegistryPullOnly`
2. `AmazonEKSWorkerNodeMinimalPolicy`
3. `AmazonSSMManagedInstanceCore`

Create the role with the exact name:

```text
aws-elasticbeanstalk-eks-node-role
```

## Role 3 — `aws-elasticbeanstalk-eks-observability-role`

**Trusted service:** `pods.eks.amazonaws.com`

Trust policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "pods.eks.amazonaws.com"
      },
      "Action": [
        "sts:AssumeRole",
        "sts:TagSession"
      ]
    }
  ]
}
```

Attach these two AWS-managed policies:

1. `AWSElasticBeanstalkEKSObservability`
2. `CloudWatchAgentServerPolicy`

Create the role with the exact name:

```text
aws-elasticbeanstalk-eks-observability-role
```

## Role 4 — `sahayak-application-role`

This role allows the Sahayak backend running in the Cluster environment to retrieve its Parameter Store configuration.

**Trusted service:** `pods.eks.amazonaws.com`

Trust policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "pods.eks.amazonaws.com"
      },
      "Action": [
        "sts:AssumeRole",
        "sts:TagSession"
      ]
    }
  ]
}
```

Create the role with the exact name:

```text
sahayak-application-role
```

### Attach the custom policy `SahayakParameterStoreReadPolicy`

1. Open the `sahayak-application-role` role.
2. Select **Add permissions → Create inline policy**.
3. Open the JSON editor.
4. Paste the following policy.
5. Save the policy with the exact name `SahayakParameterStoreReadPolicy`.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "ReadSahayakParameters",
      "Effect": "Allow",
      "Action": [
        "ssm:GetParameter",
        "ssm:GetParameters"
      ],
      "Resource": [
        "arn:aws:ssm:us-east-1:033161567802:parameter/sahayak/prod/DATABASE_URL",
        "arn:aws:ssm:us-east-1:033161567802:parameter/sahayak/prod/JWT_SECRET",
        "arn:aws:ssm:us-east-1:033161567802:parameter/sahayak/prod/JWT_EXPIRES_IN",
        "arn:aws:ssm:us-east-1:033161567802:parameter/sahayak/prod/FRONTEND_URL",
        "arn:aws:ssm:us-east-1:033161567802:parameter/sahayak/prod/PORT"
      ]
    }
  ]
}
```

If you deploy in a different AWS account, replace `033161567802` in the policy ARNs with your actual account ID.

### Verify all four roles

In **IAM → Roles**, confirm the exact names and policies listed above.

Record the four role ARNs. The first three are used when creating both Cluster environments. The application role is selected for the backend environment, which needs access to Parameter Store.

The role used by GitHub Actions, `SahayakGitHubActionsECRRole`, is separate from these four roles.

---

# Phase 5 — Create the backend Elastic Beanstalk Cluster environment

Create the backend environment first because you need its Cluster network security group before completing the RDS inbound rule.

## Step 5.1 — Create the Elastic Beanstalk application

Open the [Elastic Beanstalk Console](https://console.aws.amazon.com/elasticbeanstalk/) in `us-east-1`.

1. Open **Applications**.
2. If an application named `Sahayak` exists, select it.
3. Otherwise click **Create application**.
4. Set the name to `Sahayak`.
5. Create the application.

Do not create a second `Sahayak` application if it already exists.

## Step 5.2 — Create a backend environment

Inside the `Sahayak` application:

1. Click **Create environment**.
2. Select the **Cluster** environment type, which runs the application on EKS.
3. Use the environment name:

   ```text
   sahayak-backend-env
   ```

4. Use the sample application for initial infrastructure creation if the wizard requires an application image before the real one is deployed.
5. Open the environment's service-access and networking settings.

Do not select the traditional **Standard / Web server** environment type. This project uses Elastic Beanstalk Cluster.

## Step 5.3 — Select the Cluster roles and networking

Select these existing roles:

| Setting | Role |
|---|---|
| Cluster role | `aws-elasticbeanstalk-eks-cluster-role` |
| Node role | `aws-elasticbeanstalk-eks-node-role` |
| Observability role | `aws-elasticbeanstalk-eks-observability-role` |
| Application role | `sahayak-application-role` for the backend |

For networking:

- **Environment/Cluster subnets:** Select both private application subnets from Terraform, one in `us-east-1a` and one in `us-east-1b`.
- **Load-balancer subnets:** Select both public subnets from Terraform, in the corresponding Availability Zones.
- **Load-balancer scheme:** Internet-facing.
- **Load-balancer security group:** Select `sahayak-alb-sg`, if the Cluster wizard supports selecting the existing security group.

Use the same private application subnet set and the same three core Cluster roles for both the backend and frontend environments. Elastic Beanstalk uses that subnet set to determine which EKS cluster hosts the environment.

The private subnets must have outbound internet access through NAT Gateways. Do not choose the default VPC or unrelated subnets.

Create the environment and wait for it to finish provisioning.

The first Cluster environment may take considerably longer to provision than a traditional EC2 environment.

## Step 5.4 — Configure the backend service port

The backend listens on port `5000`. In the Cluster environment settings, set:

```text
Namespace: aws:elasticbeanstalk:eks:environment
Option:    service-port
Value:     5000
```

Set the backend health-check path to `/api/health` where the Cluster load-balancer configuration supports that option.

Record the backend environment's URL/CNAME.

---

# Phase 6 — Add the backend Cluster security group to the RDS security group

At this point, RDS exists, and the backend Cluster environment has been created. Now allow the backend workload to connect to PostgreSQL.

## Step 6.1 — Identify the backend Cluster security group

1. Open the **Elastic Beanstalk Console** and select `sahayak-backend-env`.
2. Find the EKS cluster associated with the environment from its Cluster details or events.
3. Open **Amazon EKS → Clusters**.
4. Select the correct cluster and inspect its Networking details.
5. Identify the security group actually used by the backend workload's network path. Verify this against the security groups attached to the relevant node/workload network interfaces.

Use the verified backend workload/Cluster security group. Do not assume the load balancer security group is the source of backend-to-database traffic.

Check that the security group is associated with the same VPC as the RDS instance.

## Step 6.2 — Edit the RDS security group

1. Open the [EC2 Console](https://console.aws.amazon.com/ec2/).
2. Select **Security Groups** under Network & Security.
3. Open the security group named:

   ```text
   sahayak-rds-sg
   ```

4. Select **Inbound rules → Edit inbound rules**.
5. Click **Add rule**.
6. Configure the rule:

   | Setting | Value |
   |---|---|
   | Type | PostgreSQL |
   | Protocol | TCP |
   | Port range | `5432` |
   | Source | Backend workload/Cluster security group identified in Step 6.1 |
   | Description | `PostgreSQL from Sahayak backend Cluster` |

7. Click **Save rules**.

Do not use `0.0.0.0/0` as the source.

This rule allows the backend workload to connect to the private PostgreSQL database on port `5432`.

**Terraform note:** The existing networking Terraform configuration manages the RDS security group. A later `terraform apply` can change manually edited rules. Before reapplying networking Terraform, incorporate the additional backend security-group rule into the Terraform configuration or otherwise reconcile the state. Do not assume a console-only rule will remain indefinitely.

---

# Phase 7 — Create the Parameter Store parameters

Open the [AWS Systems Manager Console](https://console.aws.amazon.com/systems-manager/) in `us-east-1`.

Navigate to **Parameter Store → Create parameter**.

Create these five parameters.

| Name | Type | Value |
|---|---|---|
| `/sahayak/prod/DATABASE_URL` | `SecureString` | Full PostgreSQL connection URL |
| `/sahayak/prod/JWT_SECRET` | `SecureString` | Strong random JWT signing secret |
| `/sahayak/prod/JWT_EXPIRES_IN` | `String` | `7d` |
| `/sahayak/prod/FRONTEND_URL` | `String` | Actual HTTPS frontend CNAME |
| `/sahayak/prod/PORT` | `String` | `5000` |

## Step 7.1 — Set the database connection URL

Use the values from Phase 3:

```text
postgresql://sahayak_admin:<DATABASE_PASSWORD>@<RDS_ENDPOINT>:5432/sahayak_DB?schema=public
```

Replace both placeholders with the actual RDS password and endpoint.

URL-encode special characters in the password if necessary. Never put the complete connection URL in GitHub or a public log.

## Step 7.2 — Set the JWT secret

Generate a strong random value:

```bash
openssl rand -base64 48
```

Use the generated value for `/sahayak/prod/JWT_SECRET`.

Do not use a sample or placeholder secret in production.

## Step 7.3 — Set the frontend URL

After creating the frontend environment in Phase 8, set:

```text
/sahayak/prod/FRONTEND_URL = https://<ACTUAL_FRONTEND_CNAME>
```

Replace the placeholder with the exact CNAME shown by Elastic Beanstalk.

## Step 7.4 — Verify the parameters

Run:

```bash
aws ssm describe-parameters \
  --region us-east-1 \
  --parameter-filters "Key=Name,Option=BeginsWith,Values=/sahayak/prod/" \
  --query 'Parameters[].{Name:Name,Type:Type}' \
  --output table
```

Confirm that all five parameters exist with the expected types.

The `sahayak-application-role` must be able to read these parameter ARNs through the `SahayakParameterStoreReadPolicy` policy.

---

# Phase 8 — Create the frontend Elastic Beanstalk Cluster environment

Create the frontend after the backend environment has been created.

## Step 8.1 — Create the environment

In **Elastic Beanstalk → Applications → Sahayak → Create environment**:

1. Select the **Cluster** environment type.
2. Set the environment name:

   ```text
   sahayak-frontend-env
   ```

3. Use the same two private application subnets as the backend environment.
4. Use the same Cluster role, node role and observability role ARNs as the backend environment.
5. Use the same pair of public load-balancer subnets.
6. Choose the public internet-facing load-balancer configuration.
7. Use `sahayak-alb-sg` if the wizard supports selecting that existing security group.
8. Create the environment.

The frontend does not need `sahayak-application-role` for its static Nginx content unless you have a separate reason for the frontend container to call AWS services.

## Step 8.2 — Configure the frontend port

The frontend image serves the React build using Nginx on port `80`.

Set:

```text
Namespace: aws:elasticbeanstalk:eks:environment
Option:    service-port
Value:     80
```

Wait for the environment to finish provisioning.

Record the frontend CNAME.

At this stage, the environment may still be running the sample application. The Sahayak frontend image is deployed in Phase 10.

---

# Phase 9 — Configure the backend secrets and frontend Nginx proxy

The backend container runs Prisma migrations before it starts the API. The Cluster environment must supply its runtime settings and secrets.

## Step 9.1 — Configure backend runtime settings

Use the Cluster configuration namespace:

```text
aws:elasticbeanstalk:eks:environment
```

Configure these options for `sahayak-backend-env`:

| Option | Value |
|---|---|
| `application-role` | ARN of `sahayak-application-role` |
| `service-port` | `5000` |
| `secrets` | JSON object mapping the application variable names to the Parameter Store ARNs |

The `secrets` JSON object should map these names to their corresponding Parameter Store ARNs:

```json
{
  "DATABASE_URL": "arn:aws:ssm:us-east-1:033161567802:parameter/sahayak/prod/DATABASE_URL",
  "JWT_SECRET": "arn:aws:ssm:us-east-1:033161567802:parameter/sahayak/prod/JWT_SECRET",
  "JWT_EXPIRES_IN": "arn:aws:ssm:us-east-1:033161567802:parameter/sahayak/prod/JWT_EXPIRES_IN",
  "FRONTEND_URL": "arn:aws:ssm:us-east-1:033161567802:parameter/sahayak/prod/FRONTEND_URL",
  "PORT": "arn:aws:ssm:us-east-1:033161567802:parameter/sahayak/prod/PORT"
}
```

Replace the account ID if deploying to another AWS account.

If you use the AWS CLI to set these options, save the option settings in a JSON file and pass it using:

```bash
aws elasticbeanstalk update-environment \
  --application-name Sahayak \
  --environment-name sahayak-backend-env \
  --option-settings file://backend-options.json \
  --region us-east-1
```

The `backend-options.json` file must contain the three Cluster options described above, using the exact format accepted by the Elastic Beanstalk API.

`secrets` is one Cluster option containing a JSON object. Do not configure each secret as a separate option name. The `application-role` is required for the Cluster environment to retrieve these parameters.

The `service-port` setting also supplies the container's `PORT` value. Keep the configured value and `/sahayak/prod/PORT` consistent at `5000`.

## Step 9.2 — Update the Nginx configuration

Open:

```text
frontend/nginx.conf
```

Locate the existing `location /api/` block. Its current proxy hostname may not match the new backend environment's CNAME.

Update the block to use the actual backend CNAME:

```nginx
location /api/ {
    proxy_pass https://<ACTUAL_BACKEND_CNAME>;

    proxy_http_version 1.1;
    proxy_ssl_server_name on;

    proxy_set_header Host $proxy_host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

Replace `<ACTUAL_BACKEND_CNAME>` with the backend environment's real hostname. Do not include `https://` inside the placeholder.

Keep the remainder of the Nginx configuration, including the existing single-page application fallback, unchanged.

This routes frontend API requests through `/api/` to the Sahayak backend.

---

# Phase 10 — Configure GitHub Actions and deploy the application

The existing workflow in `.github/workflows/ci.yaml` builds the frontend and backend Docker images and pushes them to Amazon ECR. The CD workflow in `.github/workflows/cd.yaml` creates image-based Elastic Beanstalk application versions and deploys them to the environments.

The repository uses these ECR repositories:

```text
sahayak-backend
sahayak-frontend
```

The GitHub deployment role is:

```text
SahayakGitHubActionsECRRole
```

This is separate from the four Cluster roles.

## Step 10.1 — Verify ECR repositories

```bash
aws ecr describe-repositories \
  --repository-names sahayak-backend sahayak-frontend \
  --region us-east-1
```

If a repository does not exist, create it:

```bash
aws ecr create-repository \
  --repository-name sahayak-backend \
  --image-scanning-configuration scanOnPush=true \
  --region us-east-1
```

```bash
aws ecr create-repository \
  --repository-name sahayak-frontend \
  --image-scanning-configuration scanOnPush=true \
  --region us-east-1
```

Do not recreate a repository that already exists.

## Step 10.2 — Verify the GitHub OIDC role

In IAM, confirm that `SahayakGitHubActionsECRRole` exists and its trust policy permits the intended GitHub repository and branch to assume the role using OIDC.

The role must have the permissions required to:

- Authenticate to ECR.
- Push images to both repositories.
- Create Elastic Beanstalk application versions from the image URIs.
- Update the backend and frontend environments.
- Describe the environment status and wait for deployments to finish.

Do not store long-lived AWS access keys in GitHub repository secrets.

## Step 10.3 — Match the workflow environment names

Open:

```text
.github/workflows/cd.yaml
```

The environment variables must exactly match the environments created above:

```yaml
env:
  AWS_REGION: us-east-1
  AWS_ACCOUNT_ID: "033161567802"
  EB_APPLICATION: Sahayak
  BACKEND_ENVIRONMENT: sahayak-backend-env
  FRONTEND_ENVIRONMENT: sahayak-frontend-env
```

The current repository workflow may use a different backend environment name. Update it to `sahayak-backend-env` if that is the environment you created.

If deploying into a different account, also update the workflow's AWS account ID, OIDC role ARN and ECR image URIs.

## Step 10.4 — Commit and push the configuration

Return to the repository root:

```bash
cd ~/sahayak
```

Inspect your changes:

```bash
git status --short
git diff -- frontend/nginx.conf .github/workflows/cd.yaml
```

Do not commit `.env` files, database passwords, JWT secrets, Terraform state, Terraform plans, or generated `*.auto.tfvars` files.

Commit the intended changes:

```bash
git add frontend/nginx.conf .github/workflows/cd.yaml
git commit -m "Configure Sahayak Cluster deployment"
git push origin main
```

Include any other required application configuration changes, but only stage files intended for the public repository.

## Step 10.5 — Monitor the workflows

On GitHub, open **Actions**.

1. Open the `Sahayak CI` workflow.
2. Confirm the frontend lint/build, backend dependency installation and Docker builds succeed.
3. Confirm the ECR publishing step succeeds.
4. Open `Sahayak CD`.
5. Confirm the backend image is deployed to `sahayak-backend-env`.
6. Confirm the frontend image is deployed to `sahayak-frontend-env`.

If a workflow fails, inspect the failing step and its logs before retrying.

---

# Phase 11 — Verify the live application

## Step 11.1 — Verify backend health

```bash
curl -i https://<ACTUAL_BACKEND_CNAME>/api/health
```

Expected: HTTP `200` with JSON similar to:

```json
{
  "success": true,
  "service": "sahayak-backend",
  "status": "healthy"
}
```

Replace the placeholder with the actual backend hostname.

## Step 11.2 — Verify the database-backed API

The `/api/health` endpoint confirms that the backend responds, but it may not verify the database connection.

Test an endpoint that retrieves database records:

```bash
curl -i https://<ACTUAL_BACKEND_CNAME>/api/resources
```

Use the actual backend hostname and test the application's expected response.

Confirm that:

- The backend container starts successfully.
- Prisma migrations complete without error.
- RDS is available.
- The RDS security group allows the correct backend workload security group on TCP `5432`.
- The backend has permission to retrieve its Parameter Store configuration.

Do not run `prisma migrate reset` against the production database.

## Step 11.3 — Verify the frontend and proxy

Open the frontend environment's HTTPS CNAME in a browser.

Test its API proxy:

```bash
curl -i https://<ACTUAL_FRONTEND_CNAME>/api/health
```

Expected: HTTP `200` and the backend health JSON through Nginx.

In the browser, confirm that:

- The frontend loads without a blank page.
- No critical JavaScript errors appear in the Console.
- `/api/...` requests return API responses, not the frontend's HTML.
- Login and registration work.
- Resource and provider lists load.
- Database-backed actions work as expected.

Both environments should show a successful deployment status. Investigate environment events and container logs if either environment fails to start or deploy.

---

# Phase 12 — Troubleshooting

| Problem | Check |
|---|---|
| Terraform proposes duplicate resources | A fresh clone has no previous local state. Recover or import state safely before applying to an existing environment. |
| RDS is not reachable | Verify the endpoint, credentials, database name, VPC and the inbound TCP `5432` rule from the correct backend workload security group. |
| Prisma `P1001` | Check database status, networking, security-group source and whether the backend workload is in the intended VPC. |
| Database authentication fails | Verify the RDS master username, password, URL encoding and `sahayak_DB` database name. |
| Backend containers do not start | Check `application-role`, all SSM ARNs, policy permissions, and `service-port` set to `5000`. |
| Secret access is denied | Verify the application's Pod Identity trust relationship and `SahayakParameterStoreReadPolicy`. |
| Frontend loads but API fails | Verify the real backend CNAME in `frontend/nginx.conf` and check `FRONTEND_URL`. |
| Elastic Beanstalk Cluster creation fails | Check role trust relationships and permissions, subnet selection, free subnet IP space, DNS settings and NAT access. |
| Workflow says environment not found | Ensure the backend and frontend names in `cd.yaml` exactly match the names in Elastic Beanstalk. |
| ECR push/pull fails | Check ECR repository names, AWS account IDs, OIDC trust policy and the node role's ECR permissions. |

Inspect the latest backend events with:

```bash
aws elasticbeanstalk describe-events \
  --environment-name sahayak-backend-env \
  --max-records 30 \
  --region us-east-1 \
  --query 'Events[].[EventDate,Severity,Message]' \
  --output table
```

Inspect frontend events with:

```bash
aws elasticbeanstalk describe-events \
  --environment-name sahayak-frontend-env \
  --max-records 30 \
  --region us-east-1 \
  --query 'Events[].[EventDate,Severity,Message]' \
  --output table
```

---

# Final deployment checklist ✅

- [ ] Terraform-created VPC, subnets, route tables, NAT Gateways and security groups are ready.
- [ ] RDS PostgreSQL was created through the AWS Console with database name `sahayak_DB`.
- [ ] RDS is private and uses `sahayak-rds-sg`.
- [ ] All four IAM roles exist and have the correct trust relationships and policies.
- [ ] The backend Cluster environment was created using the intended private application subnets.
- [ ] The backend workload security group was added as an inbound source in the RDS security group for PostgreSQL TCP `5432`.
- [ ] The five Parameter Store parameters exist.
- [ ] The frontend Cluster environment uses the same private application subnet set and core Cluster roles.
- [ ] The backend `service-port` is `5000`; the frontend `service-port` is `80`.
- [ ] Backend secrets are configured using the application role and Cluster-specific `secrets` option.
- [ ] Nginx uses the correct backend CNAME.
- [ ] GitHub Actions deploys the correct image versions to both environments.
- [ ] The frontend, backend health endpoint and a database-backed API operation are tested successfully.
- [ ] No production passwords, JWT secrets, or Terraform state files are committed to Git.

## Official AWS references

- [Beanstalk Cluster setup](https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/beanstalk-cluster-getting-started.html)
- [Beanstalk Cluster IAM roles and permissions](https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/beanstalk-cluster-permissions.html)
- [Beanstalk Cluster networking](https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/configuring-cluster-networking.html)
- [Beanstalk Cluster configuration options](https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/command-options-general-eks.html)

**Deployment order to remember:** Terraform networking → manually create RDS → create four IAM roles → create backend Cluster → add the backend workload security group to RDS inbound rules → create Parameter Store parameters → create frontend Cluster → configure the backend and Nginx → deploy through GitHub Actions → test the live application.