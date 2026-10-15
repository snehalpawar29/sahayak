# Sahayak: Complete step-by-step deployment guide — Local → Amazon RDS → Elastic Beanstalk 🚑

This guide follows one sequence and keeps the existing Sahayak project structure. It explains what to open, what to select, what to type, what to click next, and how to verify each step.

GitHub repository: [snehalpawar29/sahayak](https://github.com/snehalpawar29/sahayak)

## Before starting: important rules

1. Do not create duplicate AWS resources. Your previous environment was named `sahayak-prod` in `us-east-1`, but its current status is unknown. First check whether it still exists.
2. Do not delete your local project or database. We will test the project before deploying it.
3. Do not put passwords, JWT secrets, or database credentials in GitHub.
4. AWS can charge for RDS, EC2, load balancers, NAT gateways, storage, public IPv4 addresses, and other resources. Check the Billing page before leaving anything running.
5. The project’s production Docker Compose file builds the backend and frontend, and the backend requires the included RDS CA certificate at `backend/certs/rds-global-bundle.pem`. Keep that file in the deployment package.

# Phase 1 — Check your existing AWS resources first

We need to know what already exists before creating anything.

## Step 1.1 — Open a terminal

Open the terminal you normally use for your project. If you are using Windows, you can use PowerShell, Git Bash, or WSL. If you are using an EC2 terminal, use that terminal.

Check that the AWS CLI is installed:

```
aws --version
```

Expected result: a line beginning with `aws-cli/`.

If the command is not found, install or configure AWS CLI before continuing.

## Step 1.2 — Check which AWS account is active

Run:

```
aws sts get-caller-identity
```

Expected result: JSON containing `Account` and `Arn`.

Make sure this is the AWS account where you created Sahayak resources. Do not paste secret keys or credentials into chat.

## Step 1.3 — Check the existing Elastic Beanstalk environment

Run:

```
aws elasticbeanstalk describe-environments \
  --application-name Sahayak \
  --environment-names sahayak-prod \
  --region us-east-1 \
  --query "Environments[].{Name:EnvironmentName,Status:Status,Health:Health,URL:CNAME}" \
  --output table
```

Interpret the result:

- If `sahayak-prod` appears, note its status. Do not create another environment yet.
- If the table is empty, that named environment was not found in this account and region.
- If the command reports an error, resolve the account, permission, or region issue first.

## Step 1.4 — Check existing RDS databases

Run:

```
aws rds describe-db-instances \
  --region us-east-1 \
  --query "DBInstances[].{Identifier:DBInstanceIdentifier,Status:DBInstanceStatus,Engine:Engine,Endpoint:Endpoint.Address,Class:DBInstanceClass}" \
  --output table
```

Write down the identifier of the PostgreSQL database intended for Sahayak, if one exists. Do not assume the database name or identifier.

## Step 1.5 — Check existing SSM parameters

Run:

```
aws ssm describe-parameters \
  --region us-east-1 \
  --parameter-filters "Key=Name,Option=BeginsWith,Values=/sahayak/prod/" \
  --query "Parameters[].{Name:Name,Type:Type}" \
  --output table
```

You are looking for these parameter names:

- `/sahayak/prod/DATABASE_URL`
- `/sahayak/prod/JWT_SECRET`

This command displays parameter names and types, not their secret values.

Stop here if you are unsure which existing resources belong to Sahayak. Use the existing resources where appropriate instead of making duplicates.

# Phase 2 — Get the project ready locally

## Step 2.1 — Open the repository

If you already have the project on your computer, open a terminal in its root folder — the folder containing `backend`, `frontend`, and `docker-compose.yml`.

If you do not have it locally, run:

```
git clone https://github.com/snehalpawar29/sahayak.git
cd sahayak
```

If you already have the repository, run:

```
cd path/to/sahayak
```

Replace `path/to/sahayak` with your actual project path.

Confirm the folder contents:

```
ls
```

You should see items including `backend`, `frontend`, and `docker-compose.yml`.

On Windows PowerShell, `dir` can be used instead of `ls`.

## Step 2.2 — Confirm Docker is running

Run:

```
docker --version
docker compose version
```

Both commands should print version information.

Then run:

```
docker ps
```

It should show your running containers or an empty list. If Docker is not running, start Docker Desktop or the Docker service before continuing.

## Step 2.3 — Create the local environment file

First check whether `.env` already exists.

Linux, macOS, Git Bash, or WSL:

```
ls -la .env
```

PowerShell:

```
Test-Path .env
```

If it already exists, do not overwrite it. Open it and check the values. If it does not exist, create `.env` in the project root.

Use this local development configuration:

```
POSTGRES_USER=sahayak_user
POSTGRES_PASSWORD=sahayak_password
POSTGRES_DB=sahayak_DB

DATABASE_URL=postgresql://sahayak_user:sahayak_password@postgres:5432/sahayak_DB?schema=public
DATABASE_SSL=false

JWT_SECRET=replace_with_a_long_random_secret
JWT_EXPIRES_IN=7d
FRONTEND_URL=http://localhost:5173
```

Save the file.

Important: These are local development credentials. Do not reuse the sample password or JWT secret in production.

If your current `.env` contains different database settings that are already working, do not blindly replace them. Match the values to your local Compose configuration.

## Step 2.4 — Start the local project

From the project root, run:

```
docker compose up --build -d
```

Wait for the command to finish. The first build may take a few minutes.

Check container status:

```
docker compose ps
```

Check logs:

```
docker compose logs --tail=100
```

If a container is restarting or unhealthy, do not move to AWS yet. Inspect the error first.

## Step 2.5 — Apply database migrations locally

Run:

```
docker compose exec backend npx prisma migrate deploy
```

If the command says the backend service is not running, check:

```
docker compose ps
docker compose logs backend --tail=100
```

If the repository uses existing Prisma migration files, `migrate deploy` applies pending migrations without creating a new migration interactively. Do not run a destructive database reset on a database containing data you need.

## Step 2.6 — Test the local backend

Run:

```
curl -i http://localhost:5000/api/health
```

Expected result: HTTP `200` and a JSON response indicating that the backend is healthy.

If `curl` is not available, open this URL in your browser:

`http://localhost:5000/api/health`

## Step 2.7 — Test the local frontend

Open:

`http://localhost:5173`

Check that the page loads. Test the functions you have implemented, especially login, provider registration, resource listing, and emergency requests.

If the frontend loads but its API requests fail, inspect the browser Developer Tools → Console and Network tabs. Fix local errors before continuing.

# Phase 3 — Prepare Amazon RDS PostgreSQL

Do this phase only if Phase 1 confirmed you do not already have a suitable Sahayak database. If one exists, inspect its status, endpoint, security group, and backup situation instead of creating another.

## Step 3.1 — Open the RDS console

1. Open the [AWS Management Console](https://console.aws.amazon.com/).
2. Sign in to the correct AWS account.
3. Use the region selector at the top-right.
4. Select US East (N. Virginia) — `us-east-1`.
5. In the search box, type RDS.
6. Open RDS.
7. In the left navigation, click Databases.

If your Sahayak database already appears, select it and record its status and endpoint. Do not create a second database just because you are following this guide.

## Step 3.2 — Create a database only if required

1. Click Create database.
2. Under database creation method, choose Standard create.
3. Under engine options, choose PostgreSQL.
4. Select a PostgreSQL version supported by your application and the AWS console. Avoid upgrading an existing database merely to match a guide.
5. For the template, choose Free tier only if the console offers it and your account and selected configuration qualify. Otherwise select the least-cost suitable option available.
6. Under availability, choose a Single-AZ deployment for a low-cost hackathon demo, if available and appropriate. This is not a high-availability production configuration.

### Settings

For the database settings:

- DB instance identifier: `sahayak-db` — only if that identifier is not already in use.
- Master username: `sahayak_user`
- Master password: create a strong, unique password and save it in a secure password manager.
- Confirm password: type the same password again.

Do not use the sample local password `sahayak_password` for RDS.

### Instance configuration and storage

1. Choose the smallest instance class that is available and appropriate for your demo.
2. Keep storage at the lowest supported size that will accommodate your data.
3. Do not enable extra paid storage features unless you need them.
4. Review any estimated monthly costs shown by the console.

Availability of instance classes and Free Tier eligibility depends on your account and current AWS offerings. Read the console’s cost and eligibility notices before creating the database.

### Connectivity

1. For Compute resource, choose the option that lets you configure connectivity yourself, if presented.
2. Select the VPC intended for your deployment.
3. Set Public access to No.
4. Select an existing DB security group that is correct for Sahayak, or create a dedicated one as described below.
5. For the database port, use `5432`.
6. Do not open PostgreSQL to `0.0.0.0/0`.

The database should be private. The Elastic Beanstalk EC2 instance should connect to it through security-group rules.

### Authentication and monitoring

1. Use password authentication unless you have a specific configured alternative.
2. Leave optional paid monitoring and add-on features disabled for this low-cost demo unless needed.
3. Review backup retention and other settings. Backups can incur storage charges, so choose a retention policy suitable for the project and your data.

Click Create database.

Wait until the status becomes Available. This can take several minutes.

## Step 3.3 — Create the database security-group rule

The database must accept PostgreSQL connections from the Elastic Beanstalk instance, not from everyone on the internet.

1. Open the [EC2 console](https://console.aws.amazon.com/ec2/), keeping the region at `us-east-1`.
2. In the left navigation, go to Network & Security → Security Groups.
3. Find the security group attached to the RDS database.
4. Select it.
5. Open Inbound rules.
6. Click Edit inbound rules.
7. Click Add rule.
8. Type: PostgreSQL.
9. Port: `5432`.
10. Source: select the security group of the Elastic Beanstalk EC2 instance, not `Anywhere-IPv4`.
11. Click Save rules.

If the Elastic Beanstalk instance security group does not exist yet, finish the EB setup in Phase 6, then return here and add this rule.

Do not make RDS publicly accessible just to make a connection test easier.

## Step 3.4 — Record the RDS endpoint

1. Return to RDS → Databases.
2. Click the Sahayak database.
3. Find Connectivity & security.
4. Copy the Endpoint hostname.
5. Record the port, normally `5432`.

The endpoint is a hostname, not a full URL. You will use it in the `DATABASE_URL` parameter later.

# Phase 4 — Store production secrets in AWS Systems Manager Parameter Store

Sahayak’s production configuration references these two SSM parameters:

- `/sahayak/prod/DATABASE_URL`
- `/sahayak/prod/JWT_SECRET`

The deployment configuration file is `deployment/elastic-beanstalk/.ebextensions/01-secrets.config`. It currently contains ARNs for account `033161567802` in region `us-east-1`. If your active AWS account differs, those ARNs must be updated before deployment.

## Step 4.1 — Build the production database URL

The format is:

```
postgresql://USERNAME:PASSWORD@RDS_ENDPOINT:5432/DATABASE_NAME?schema=public
```

Replace each placeholder with your actual RDS username, password, endpoint, and database name.

For example, if the password contains special characters such as `@`, `:`, `/`, `?`, or `#`, URL-encode those characters before putting the password in the URL. Otherwise the URL may be parsed incorrectly.

Keep the complete database URL private. Do not paste it into GitHub, a public issue, or a screenshot.

## Step 4.2 — Open Parameter Store

1. Open the [AWS Systems Manager console](https://console.aws.amazon.com/systems-manager/).
2. Confirm the region is US East (N. Virginia), `us-east-1`.
3. In the left navigation, find Application Management → Parameter Store. The exact navigation grouping may vary.
4. Click Create parameter.

### Create `DATABASE_URL`

Fill in:

- Name: `/sahayak/prod/DATABASE_URL`
- Description: `Sahayak production PostgreSQL connection URL`
- Tier: Standard, unless your account or needs require otherwise.
- Type: `SecureString`
- KMS key: use the default AWS-managed key unless you have a specific reason to use a customer-managed key.
- Value: paste your complete production database URL.

Click Create parameter.

### Create `JWT_SECRET`

Click Create parameter again.

Fill in:

- Name: `/sahayak/prod/JWT_SECRET`
- Description: `Sahayak production JWT signing secret`
- Tier: Standard.
- Type: `SecureString`
- KMS key: default AWS-managed key unless you have a specific reason to use another key.
- Value: generate a long, random secret. Do not use `replace_with_a_long_random_secret`.

Click Create parameter.

Keep the secret private. If you later change the JWT secret, existing signed-in sessions may stop working.

## Step 4.3 — Verify the parameter names

In Parameter Store, confirm that both names exist and have type `SecureString`.

You can also run:

```
aws ssm describe-parameters \
  --region us-east-1 \
  --parameter-filters "Key=Name,Option=BeginsWith,Values=/sahayak/prod/" \
  --query "Parameters[].{Name:Name,Type:Type}" \
  --output table
```

This verifies the names without printing their secret values.

# Phase 5 — Prepare IAM permissions for Elastic Beanstalk

Elastic Beanstalk needs an EC2 instance profile so the EC2 instance running your containers can retrieve the SSM secrets. Do not put AWS access keys in `.env` or inside the Docker image.

## Step 5.1 — Check whether the role already exists

1. Open the [IAM console](https://console.aws.amazon.com/iam/).
2. Select Roles.
3. Search for a role already used by your Elastic Beanstalk environment.

If the environment already has a suitable instance profile and it has the required permissions, reuse it rather than creating another role.

## Step 5.2 — Create the EC2 role if needed

1. In IAM, click Roles.
2. Click Create role.
3. Under Trusted entity type, choose AWS service.
4. Under Use case, choose EC2.
5. Click Next.
6. Add the permissions needed for the Elastic Beanstalk EC2 instance. The basic Elastic Beanstalk EC2 managed policy commonly used for web-tier instances is `AWSElasticBeanstalkWebTier`. Follow the console’s current recommended policies for the platform you selected.
7. Click Next.
8. Role name: `SahayakElasticBeanstalkEC2Role` — use a different name if it already exists.
9. Review the trusted entity and policies.
10. Click Create role.

Do not attach broad `AdministratorAccess` to the EC2 instance.

## Step 5.3 — Allow the role to read only the Sahayak parameters

The role needs permission to read the two parameter names used by the application.

1. In IAM → Roles, open `SahayakElasticBeanstalkEC2Role`.
2. Click Add permissions → Create inline policy.
3. Open the JSON editor.
4. Enter the policy below, replacing the account number with the account shown by `aws sts get-caller-identity` if it is different.

```
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ssm:GetParameter"
      ],
      "Resource": [
        "arn:aws:ssm:us-east-1:033161567802:parameter/sahayak/prod/DATABASE_URL",
        "arn:aws:ssm:us-east-1:033161567802:parameter/sahayak/prod/JWT_SECRET"
      ]
    }
  ]
}
```

5. Click Next.
6. Policy name: `SahayakReadProductionParameters`.
7. Click Create policy or Save changes.

If you chose a customer-managed KMS key for the parameters, the role may also need `kms:Decrypt` on that specific key. Do not grant broad KMS access.

## Step 5.4 — Confirm the role can be selected as an instance profile

For an EC2 role to be used by Elastic Beanstalk, it must have an associated instance profile. When the role is created through the normal EC2 use case in IAM, AWS typically creates the instance profile association automatically. Confirm that the role is available in the Elastic Beanstalk environment’s EC2 instance profile selector.

# Phase 6 — Configure Elastic Beanstalk

Before creating a new environment, return to Phase 1 and confirm that `sahayak-prod` is not already running. If it exists, open it and inspect its configuration instead of creating a duplicate.

## Step 6.1 — Open Elastic Beanstalk

1. Open the [Elastic Beanstalk console](https://console.aws.amazon.com/elasticbeanstalk/).
2. Set the region to US East (N. Virginia), `us-east-1`.
3. Open Applications.
4. If the application `Sahayak` exists, click it.
5. If it does not exist, click Create application.
6. Application name: `Sahayak`.
7. Add a description such as `Sahayak Emergency Resource Finder`.
8. Click Create.

Do not create a second application if `Sahayak` already exists.

## Step 6.2 — Start environment creation

1. Open the `Sahayak` application.
2. Click Create environment.
3. Choose Web server environment.
4. Click Next or Configure more options, depending on the console screen.

### Application information

- Environment name: `sahayak-prod`, if it is not already in use.
- Domain: use the default generated domain unless you have a specific reason to change it.
- Check that the region is `us-east-1`.

### Platform

Choose the Docker platform compatible with the project’s Docker Compose deployment. Prefer the currently supported Docker running on 64bit Amazon Linux 2023 platform if offered.

Do not choose a Node.js-only platform for this Docker Compose package, because the deployment expects Docker to build and run both frontend and backend services.

### Application code

For the initial environment creation, choose the sample application if that is the available way to create the environment before uploading the real bundle. You will replace it with the Sahayak application bundle in Phase 8.

Click Next.

## Step 6.3 — Configure the environment

Choose Configure more options if shown. Review each section carefully.

### Presets and capacity

- Select a single-instance preset or equivalent for a low-cost demo, if the console offers it.
- Do not choose a load-balanced, multi-instance configuration unless you specifically need it and have reviewed its cost.

A load balancer can add charges even when traffic is low.

### Software and environment properties

The application uses:

- `DATABASE_URL`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`
- `FRONTEND_URL`
- `PORT`
- `NODE_ENV`

The first two should be injected through the SSM secret configuration in the deployment package. Do not paste their values into a plain-text environment property field.

The production Compose file defaults `JWT_EXPIRES_IN` to `7d` and `FRONTEND_URL` to `http://localhost`. Since the frontend and backend are served on the same public site through Nginx, confirm that this default is appropriate for the deployed application’s CORS and authentication flow. If you change it, make sure the browser’s actual site origin is used.

### Security

- Select or create an EC2 key pair only if you need SSH access for troubleshooting. Keep the private key safe.
- Under EC2 instance profile, choose the EC2 role created in Phase 5.
- Do not give the EC2 instance broad administrator permissions.

### Networking

- Choose the VPC where the EB instance and RDS database can communicate.
- For a simple demo, use the appropriate existing VPC and subnet arrangement if it is already set up.
- Ensure the EC2 instance can reach the internet to retrieve required images/packages during deployment if your configuration requires it.
- Keep RDS private.
- Do not open the database to the public internet.

If you are unsure about the VPC/subnet choices, do not guess. Inspect the RDS VPC and the Elastic Beanstalk environment’s network configuration and ensure the instance and database have compatible network access.

### Review and create

1. Review all settings.
2. Check the instance type and estimated costs.
3. Check that the selected instance profile is the intended EC2 role.
4. Click Create environment.

Wait until the environment creation process finishes. It can take several minutes.

If creation fails, open the environment’s Events tab and read the latest error before changing settings.

# Phase 7 — Update the deployment configuration files

Your repository already has a production deployment folder:

```
deployment/elastic-beanstalk/
├── docker-compose.yml
└── .ebextensions/
    └── 01-secrets.config
```

The production Compose file expects `backend/` and `frontend/` folders alongside `docker-compose.yml`. Therefore, do not upload only the `deployment/elastic-beanstalk` folder. The final deployment bundle needs the correct structure at its root.

## Step 7.1 — Check the secret ARNs

Open this file in your project:

```
deployment/elastic-beanstalk/.ebextensions/01-secrets.config
```

It currently contains:

```
option_settings:
  aws:elasticbeanstalk:application:environmentsecrets:
    DATABASE_URL: arn:aws:ssm:us-east-1:033161567802:parameter/sahayak/prod/DATABASE_URL
    JWT_SECRET: arn:aws:ssm:us-east-1:033161567802:parameter/sahayak/prod/JWT_SECRET
```

If your AWS account is still `033161567802` and your region is still `us-east-1`, the account and region portions match the existing configuration.

If either is different, replace the account number and/or region in both ARNs with your actual values. Keep the parameter names unchanged unless you created them under different names.

Save the file.

## Step 7.2 — Verify that the deployment files exist

From the project root, run:

```
ls deployment/elastic-beanstalk
ls deployment/elastic-beanstalk/.ebextensions
ls backend/certs/rds-global-bundle.pem
ls backend/Dockerfile
ls frontend/Dockerfile
ls frontend/nginx.conf
```

Each command should show the requested file or directory. If a file is missing, stop and correct the package before deployment.

## Step 7.3 — Confirm the frontend API proxy

The project’s Nginx configuration should proxy `/api/` requests to the backend Compose service, named `backend`, on port `5000`.

Open:

```
frontend/nginx.conf
```

Confirm it contains the expected `/api/` proxy configuration. Do not rename the backend service in production `docker-compose.yml` unless you also update the proxy configuration.

# Phase 8 — Connect the production database and run migrations

Do not run migrations until you have confirmed the correct RDS endpoint, username, password, database name, and security-group connectivity.

## Step 8.1 — Build the production database URL

Use this format:

```
postgresql://USERNAME:PASSWORD@RDS_ENDPOINT:5432/DATABASE_NAME?schema=public
```

Replace the placeholders with your real production details.

Keep this URL private. Do not include it in the deployment ZIP, GitHub repository, screenshots, or a public terminal transcript.

## Step 8.2 — Confirm the backend can reach RDS

The backend container needs:

- A valid production `DATABASE_URL`.
- The RDS CA certificate at `/app/certs/rds-global-bundle.pem`.
- Network access to the RDS endpoint on port `5432`.
- A database security-group inbound rule allowing the EB EC2 security group.

If you get a timeout, check security groups, VPC, subnets, and routing. If you get a certificate error, check the RDS CA bundle and connection configuration. Do not “fix” certificate errors by disabling certificate verification.

## Step 8.3 — Run Prisma migrations against RDS

The repository’s `backend/prisma.config.ts` reads `DATABASE_URL` from the environment. Its migration path is `prisma/migrations`.

The safest approach is to run the migration command from a trusted terminal that has the backend dependencies installed and can reach RDS, with the production URL supplied only to that process.

From the backend folder, make sure dependencies are installed:

```
cd backend
npm ci
```

Then set the production database URL for the current shell session and run:

```
npx prisma migrate deploy
```

Do not paste the real URL into a shared document or commit it to Git. If your shell history records commands, avoid putting the secret directly into the command line. Use a private temporary environment variable or another secure method to supply it.

If the command succeeds, it should report that pending migrations were applied or that no pending migrations were found.

If it fails:

- Authentication failed: verify the database username and password.
- Connection timeout: check the RDS security group and network access.
- Certificate error: verify the CA bundle and SSL configuration.
- Missing migration files: inspect `backend/prisma/migrations` in the repository.

Do not run `prisma migrate reset` against production. That can destroy data.

# Phase 9 — Build the correct Elastic Beanstalk deployment ZIP

The ZIP must have `docker-compose.yml`, `.ebextensions/`, `backend/`, and `frontend/` at the top level.

## Step 9.1 — Create a clean staging folder

From the repository root, create a folder named `eb-bundle`:

```
mkdir -p eb-bundle
```

Copy the production Compose file and `.ebextensions` folder into it:

```
cp deployment/elastic-beanstalk/docker-compose.yml eb-bundle/docker-compose.yml
cp -R deployment/elastic-beanstalk/.ebextensions eb-bundle/.ebextensions
```

Copy the application folders:

```
cp -R backend eb-bundle/backend
cp -R frontend eb-bundle/frontend
```

Do not copy your root `.env` file into `eb-bundle`.

The backend and frontend folders should contain their Dockerfiles and the files those Dockerfiles require, including `backend/certs/rds-global-bundle.pem`.

## Step 9.2 — Inspect the staging folder

Run:

```
ls -la eb-bundle
ls -la eb-bundle/.ebextensions
ls -la eb-bundle/backend
ls -la eb-bundle/frontend
```

Expected structure:

```
eb-bundle/
├── docker-compose.yml
├── .ebextensions/
│   └── 01-secrets.config
├── backend/
│   ├── Dockerfile
│   ├── package.json
│   ├── prisma.config.ts
│   ├── prisma/
│   ├── src/
│   └── certs/
│       └── rds-global-bundle.pem
└── frontend/
    ├── Dockerfile
    ├── nginx.conf
    └── package.json
```

Other application files may also be present. The key point is that the paths above must exist relative to the ZIP root.

## Step 9.3 — Exclude local secrets and unnecessary files

Do not include:

- `.env` or `.env.*` files containing secrets.
- `node_modules` folders.
- Local database dumps unless you deliberately need a backup.
- Private keys or AWS credentials.

If your copied backend/frontend folders contain `node_modules`, remove those folders from the staging copy only. Do not delete your original project dependencies.

For example:

```
rm -rf eb-bundle/backend/node_modules
rm -rf eb-bundle/frontend/node_modules
```

## Step 9.4 — Create the ZIP

From the repository root, run:

```
cd eb-bundle
zip -r ../sahayak-eb.zip .
cd ..
```

If `zip` is unavailable, install it or use a ZIP tool that preserves the `.ebextensions` directory. Be sure to zip the contents of `eb-bundle`, not the `eb-bundle` folder itself.

## Step 9.5 — Verify the ZIP structure

Run:

```
unzip -l sahayak-eb.zip
```

Confirm that the listing begins with paths like:

```
docker-compose.yml
.ebextensions/01-secrets.config
backend/Dockerfile
frontend/Dockerfile
```

If the listing instead starts with `eb-bundle/docker-compose.yml`, recreate the ZIP from inside `eb-bundle`.

# Phase 10 — Upload the ZIP to S3

Elastic Beanstalk can deploy an application version from an S3 object. If you already have a suitable S3 bucket, reuse it. Otherwise create a dedicated bucket in the same region.

## Step 10.1 — Check for an existing bucket

Run:

```
aws s3 ls
```

Find a bucket you already use for Sahayak deployment artifacts. Do not use a bucket you do not own or have permission to access.

If you do not have a suitable bucket, create a unique bucket name, such as `sahayak-deploy-<unique-suffix>`, replacing the placeholder with a unique value. S3 bucket names must be globally unique.

## Step 10.2 — Create a bucket only if needed

In the AWS console:

1. Open S3.
2. Click Create bucket.
3. Bucket name: enter your unique name.
4. AWS Region: select `us-east-1`.
5. Keep Block all public access enabled.
6. Leave the bucket private.
7. Click Create bucket.

Do not make the deployment bucket public.

## Step 10.3 — Upload the ZIP

Replace `YOUR_BUCKET_NAME` with your actual bucket name:

```
aws s3 cp sahayak-eb.zip s3://YOUR_BUCKET_NAME/sahayak-eb.zip --region us-east-1
```

Verify the upload:

```
aws s3 ls s3://YOUR_BUCKET_NAME/ --region us-east-1
```

You should see `sahayak-eb.zip`.

# Phase 11 — Create an Elastic Beanstalk application version

If the `Sahayak` application and `sahayak-prod` environment already exist, use them. Do not create duplicates.

## Step 11.1 — Create the application version

1. Open the [Elastic Beanstalk console](https://console.aws.amazon.com/elasticbeanstalk/).
2. Set the region to `us-east-1`.
3. Click Applications.
4. Click Sahayak.
5. Open Application versions.
6. Click Upload or Create a new application version, depending on the screen.
7. Version label: `sahayak-v1` if that label is not already used. Otherwise choose a new label, such as `sahayak-v2`.
8. For the source bundle, choose the S3 bucket and object that contain `sahayak-eb.zip`.
9. Click Upload or Create to finish creating the version.

If the console offers a direct upload option, you can upload the ZIP from your computer instead of selecting the S3 object. Use one method, not both.

## Step 11.2 — Deploy the version

1. Open Environments under the `Sahayak` application.
2. Click the existing `sahayak-prod` environment.
3. Click Upload and deploy or Deploy, depending on the console view.
4. Select the application version you just created.
5. Click Deploy.
6. Wait for the deployment and health checks to complete.

Do not repeatedly click Deploy if the first deployment is still running. Open the Events tab to check progress.

# Phase 12 — Verify the live application

## Step 12.1 — Check environment health

In Elastic Beanstalk:

1. Open `Sahayak → Environments → sahayak-prod`.
2. Confirm the environment status is ready and health is acceptable.
3. Copy the environment URL shown by the console.

If the environment is unhealthy, open Events and look at the newest errors first.

## Step 12.2 — Test the backend health endpoint

If the environment URL is:

```
http://YOUR-ENVIRONMENT-URL
```

open:

```
http://YOUR-ENVIRONMENT-URL/api/health
```

Or run:

```
curl -i http://YOUR-ENVIRONMENT-URL/api/health
```

Expected: HTTP `200` and JSON indicating that the backend is healthy.

If the URL uses HTTPS, use the HTTPS version.

## Step 12.3 — Test the frontend

Open the environment’s root URL in your browser.

Check:

- The frontend loads without a blank page.
- Browser Developer Tools → Console does not show critical errors.
- Developer Tools → Network shows `/api/` requests reaching the API rather than returning the frontend HTML.
- Provider and resource lists load.
- Login and registration work.
- Provider verification and emergency request flows work as intended.

## Step 12.4 — Check application logs if anything fails

In Elastic Beanstalk, open the environment and use Logs → Request logs to request recent logs or full logs, depending on the available options.

Inspect the backend and Docker errors. You can also use the environment’s Events page to identify deployment failures.

Typical issues:

| Symptom                                 | What to check                                                            |
| --------------------------------------- | ------------------------------------------------------------------------ |
| Frontend loads, API returns HTML or 404 | Nginx `/api/` proxy and production bundle structure                      |
| Backend cannot connect to RDS           | Endpoint, credentials, RDS security group, VPC and subnets               |
| Secret cannot be retrieved              | SSM parameter ARN, account/region, EC2 instance profile, IAM permissions |
| Database tables missing                 | Run `prisma migrate deploy` against the correct production database      |
| SSL certificate error                   | RDS CA bundle path and SSL settings                                      |
| Container build fails                   | Dockerfile, `package.json`, Prisma config, certificate file, build logs  |
| Environment deployment fails            | Elastic Beanstalk Events and application logs                            |

# Phase 13 — Final checklist before sharing the project

Use this checklist to confirm the deployment is ready.

### Deployment readiness

0 of 9

Local Docker Compose stack starts successfully

Frontend and backend containers are running.

Local backend health endpoint returns HTTP 200

Check /api/health.

RDS is Available and remains private

Do not expose PostgreSQL to the public internet.

Both SSM SecureString parameters exist

DATABASE_URL and JWT_SECRET.

EC2 instance profile has the required permissions

Elastic Beanstalk permissions plus access to the two SSM parameters.

Deployment ZIP has the correct root structure

docker-compose.yml, .ebextensions, backend, frontend.

Elastic Beanstalk deployment is healthy

Check environment status and Events.

Live frontend and backend API work

Test the browser and /api/health.

Secrets are absent from Git and the ZIP

No production .env, passwords, JWT secrets, or AWS credentials.

# Phase 14 — Control AWS costs and clean up safely 💰

Elastic Beanstalk itself does not have a separate environment fee, but the AWS resources it creates or uses can cost money.

## If you need the project to stay online

- Keep only the resources required for the demo.
- Review the EC2 instance type and RDS instance class.
- Avoid unnecessary load balancers, NAT gateways, and additional instances.
- Set an AWS Budget alert in Billing and Cost Management → Budgets.
- Check actual usage and billing; estimates are not guarantees.

## If you are finished with the demo

First decide whether you need to preserve the database data.

1. Export or back up any data you need.
2. Open Elastic Beanstalk → Applications → Sahayak → Environments.
3. Select `sahayak-prod`.
4. Choose Actions → Terminate environment.
5. Read the confirmation screen and confirm termination only if you intend to take the environment offline.

Terminating the EB environment does not necessarily delete the RDS database, S3 deployment artifacts, snapshots, or every associated resource.

Next, inspect RDS → Databases, EC2 volumes and snapshots, NAT gateways, load balancers, public IPv4 addresses, and S3. Delete only resources you have identified as belonging to Sahayak and no longer need. Deleting a database without a backup can permanently destroy its data.

## Important deployment note

The repository’s `.ebextensions/01-secrets.config` uses Elastic Beanstalk’s `aws:elasticbeanstalk:application:environmentsecrets` namespace. If the selected platform or environment reports that this option is unsupported, stop and fix the secret-injection configuration before retrying deployment. Do not work around it by putting production secrets into GitHub or the ZIP.

Also, this guide cannot confirm the current status of your AWS resources from the written instructions alone. The commands in Phase 1 are deliberately first so you can check the real account state before creating anything.

Follow the phases in order. Do not proceed past a failed verification step; fix that step first.