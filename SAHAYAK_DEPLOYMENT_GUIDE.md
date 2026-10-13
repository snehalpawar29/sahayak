# Sahayak deployment guide: Local PostgreSQL → RDS → Elastic Beanstalk

This guide is for a beginner cloning https://github.com/snehalpawar29/sahayak. Follow the sections in order. AWS resources may incur charges. Never commit passwords, AWS credentials, `.env` files, or database dumps.

## Architecture and Compose files

- Local development: root `docker-compose.yml` runs PostgreSQL, backend, and frontend.
- Production: `deployment/elastic-beanstalk/docker-compose.yml` runs the backend and Nginx frontend; PostgreSQL is Amazon RDS.
- Elastic Beanstalk deployment ZIP must have `docker-compose.yml`, `.ebextensions/`, `backend/`, and `frontend/` at the ZIP root. Do **not** upload the GitHub repository ZIP as-is.

## 1. Prerequisites and clone

Install Git, Docker Desktop (or Docker Engine + Compose plugin), AWS CLI v2, and `zip`/`unzip`.

```bash
git --version
docker --version
docker compose version
aws --version

git clone https://github.com/snehalpawar29/sahayak.git
cd sahayak
```

## 2. Run locally with PostgreSQL

### 2.1 Create `.env`

If `.env.example` exists:

```bash
cp .env.example .env
```

Ensure the root `.env` has these values for local development:

```dotenv
POSTGRES_USER=sahayak_user
POSTGRES_PASSWORD=sahayak_password
POSTGRES_DB=sahayak_DB
DATABASE_URL=postgresql://sahayak_user:sahayak_password@postgres:5432/sahayak_DB?schema=public
DATABASE_SSL=false
JWT_SECRET=replace_with_a_long_random_secret
JWT_EXPIRES_IN=7d
FRONTEND_URL=http://localhost:5173
```

These DB credentials are local-only. Change `JWT_SECRET` to a long random value (`openssl rand -hex 32` on Linux/macOS). If you change the DB username/password/name, update `DATABASE_URL` to match. The hostname `postgres` is the Compose service name and is correct from inside the backend container.

### 2.2 Start PostgreSQL and migrate

```bash
docker compose up -d postgres
docker compose ps
docker compose logs --tail=50 postgres

docker compose run --rm backend npx prisma migrate deploy
```

Wait until PostgreSQL is healthy. The migration command applies files under `backend/prisma/migrations`; it does not seed demo records. If it fails, stop and inspect the full error.

### 2.3 Start frontend and backend

```bash
docker compose up --build -d backend frontend
docker compose ps
docker compose logs --tail=100 backend
docker compose logs --tail=100 frontend

curl -i http://localhost:5000/api/health
curl -i http://localhost:5173/
```

Open http://localhost:5173. The API health endpoint should return HTTP 200. Test registration and the main app flows.

Useful commands:

```bash
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f postgres
docker compose down
```

`docker compose down` preserves the named DB volume. Do not use `docker compose down -v` unless you intentionally want to delete local DB data.

## 3. Create Amazon RDS for PostgreSQL

### 3.1 Create the DB

In AWS Console → **RDS → Databases → Create database**:

1. Choose Standard create and PostgreSQL (use a version compatible with PostgreSQL 16).
2. Give it an identifier, e.g. `sahayak-prod-db`.
3. Set the DB name, e.g. `sahayak`; record it exactly.
4. Create a dedicated DB username and strong password. Store these securely.
5. For a real deployment, set **Public access: No** and use a VPC/subnet setup reachable from Elastic Beanstalk.
6. Create/select an RDS security group. Do not allow port 5432 from `0.0.0.0/0`.
7. Wait until the DB is **Available**. Record endpoint, port (normally 5432), DB name, username, and password.

### 3.2 Security group

In EC2 → Security Groups, add an inbound rule to the RDS security group:

- Type: PostgreSQL
- Port: 5432
- Source: the security group attached to the Elastic Beanstalk EC2 instances.

The EB instances need network routes to RDS. A private RDS DB is not directly reachable from a normal home network. For local testing, use a secure SSM/bastion/VPN tunnel. Only as a temporary learning setup, you may enable public access and allow your current public IP only; remove that rule and disable public access afterward. Never use `0.0.0.0/0`.

### 3.3 Configure CLI and URL

```bash
aws configure
export AWS_REGION=us-east-1
aws sts get-caller-identity
```

Replace the region with the one you chose. Confirm the identity is the intended AWS account.

Set the RDS URL, replacing every placeholder. URL-encode special characters in the password:

```bash
export RDS_DATABASE_URL='postgresql://DB_USER:URL_ENCODED_PASSWORD@RDS_ENDPOINT:5432/sahayak?schema=public&sslmode=require'
```

This URL contains credentials. Do not share it or commit it.

### 3.4 Apply migrations to RDS

From the repository root:

```bash
docker compose run --rm -e DATABASE_URL="$RDS_DATABASE_URL" backend npx prisma migrate deploy
```

This creates the schema from checked-in migrations; it does not copy local records. Do not continue if the command fails.

### 3.5 Optional: copy local records to RDS

Skip if you want an empty RDS database. Apply migrations first. Install PostgreSQL client tools (`pg_dump`, `pg_restore`) and ensure the computer can reach both databases.

```bash
pg_dump --host 127.0.0.1 --port 5432 \
  --username sahayak_user --dbname sahayak_DB \
  --data-only --no-owner --no-privileges --format=custom \
  --file sahayak-data.dump
```

Enter the local password when prompted. Restore into the already-migrated RDS schema:

```bash
pg_restore --host RDS_ENDPOINT --port 5432 \
  --username DB_USER --dbname sahayak \
  --data-only --no-owner --no-privileges --exit-on-error \
  sahayak-data.dump
```

Replace `RDS_ENDPOINT` and `DB_USER`; enter the RDS password if prompted. Do not restore over overlapping data without understanding the consequences. Dumps can contain user data/password hashes: protect them, never commit them, and remove them when no longer needed.

To check tables (if RDS is reachable):

```bash
psql "$RDS_DATABASE_URL" -c '\dt'
```

## 4. Optional: run local frontend/backend against RDS

Skip if your private RDS cannot be reached securely from your computer. Create a separate file so local settings are preserved:

```bash
cp .env .env.rds
```

Edit `.env.rds`: set `DATABASE_URL` to the RDS URL, `DATABASE_SSL=true`, a strong `JWT_SECRET`, and `FRONTEND_URL=http://localhost:5173`.

Start using that file:

```bash
docker compose --env-file .env.rds up --build -d backend frontend
docker compose --env-file .env.rds ps
docker compose --env-file .env.rds logs --tail=100 backend
```

Open http://localhost:5173 and test login, providers, resources, and requests. Backend traffic now uses RDS, not local PostgreSQL.

Return to local DB mode:

```bash
docker compose --env-file .env.rds down
docker compose up -d postgres
docker compose up --build -d backend frontend
```

Never commit `.env.rds`; it contains credentials.

## 5. Put production secrets in Parameter Store

### 5.1 Confirm account and region

```bash
export AWS_REGION=us-east-1
export AWS_ACCOUNT_ID="$(aws sts get-caller-identity --query Account --output text --region "$AWS_REGION")"
echo "$AWS_ACCOUNT_ID"
```

Confirm these match the RDS and EB resources.

### 5.2 Store RDS URL as SecureString

Paste the RDS URL without displaying it:

```bash
read -rsp "Paste the RDS DATABASE_URL: " DATABASE_URL
echo
aws ssm put-parameter --region "$AWS_REGION" \
  --name /sahayak/prod/DATABASE_URL \
  --type SecureString --value "$DATABASE_URL" --overwrite
unset DATABASE_URL
```

The URL should include `schema=public&sslmode=require` and URL-encoded credentials.

### 5.3 Store JWT secret

```bash
JWT_SECRET="$(openssl rand -hex 32)"
aws ssm put-parameter --region "$AWS_REGION" \
  --name /sahayak/prod/JWT_SECRET \
  --type SecureString --value "$JWT_SECRET" --overwrite
unset JWT_SECRET
```

Do not print or commit the secret.

### 5.4 IAM permissions

In IAM → Roles, identify the **EC2 instance profile role** attached to Elastic Beanstalk. Give it least-privilege `ssm:GetParameter` permission for these two ARNs, replacing REGION and ACCOUNT_ID:

- `arn:aws:ssm:REGION:ACCOUNT_ID:parameter/sahayak/prod/DATABASE_URL`
- `arn:aws:ssm:REGION:ACCOUNT_ID:parameter/sahayak/prod/JWT_SECRET`

If you use a customer-managed KMS key, also grant `kms:Decrypt` on that specific key. This permission belongs on the EC2 instance role, not just the EB service role.

## 6. Deploy to Elastic Beanstalk

### 6.1 Create environment once

In AWS Console → Elastic Beanstalk:

1. Create an application, e.g. `Sahayak`.
2. Create a Web server environment on a Docker platform compatible with the production Compose bundle (Amazon Linux 2023 Docker platform).
3. For a learning deployment, consider a single-instance environment and check current AWS costs.
4. Configure VPC/subnets and the EB EC2 security group so it can reach RDS on port 5432.
5. Select the EC2 instance profile role from section 5.4.
6. Create the environment and wait for **Ready**. Record exact application name, environment name, and CNAME.
7. Keep RDS private; do not put passwords in source files.

### 6.2 Assemble the production ZIP

The ZIP must contain these paths at its root:

```text
docker-compose.yml
.ebextensions/01-secrets.config
backend/
frontend/
```

Use `deployment/elastic-beanstalk/docker-compose.yml`, **not** the root local Compose file. The repository's `deployment/elastic-beanstalk/.ebextensions/01-secrets.config` contains account/region-specific ARNs. Copy it and edit both ARNs to use your AWS region/account while keeping parameter names `/sahayak/prod/DATABASE_URL` and `/sahayak/prod/JWT_SECRET`. Never put secret values in this config.

Run from the repository root on Linux:

```bash
mkdir -p .eb-deploy/.ebextensions
cp deployment/elastic-beanstalk/docker-compose.yml .eb-deploy/docker-compose.yml
cp deployment/elastic-beanstalk/.ebextensions/01-secrets.config .eb-deploy/.ebextensions/01-secrets.config
cp -R backend frontend .eb-deploy/
```

Edit `.eb-deploy/.ebextensions/01-secrets.config` and replace region/account IDs with your own. Then remove local dependencies, build output, Git data, and local env files:

```bash
find .eb-deploy/backend .eb-deploy/frontend -type d \
  \( -name node_modules -o -name .git -o -name dist \) -prune -exec rm -rf {} +
find .eb-deploy/backend .eb-deploy/frontend -type f \
  \( -name '.env' -o -name '.env.local' -o -name '.env.production' \) -delete
```

Create ZIP from inside staging so paths are at the ZIP root:

```bash
rm -f sahayak-eb-deploy.zip
cd .eb-deploy
zip -qr ../sahayak-eb-deploy.zip docker-compose.yml .ebextensions backend frontend
cd ..
unzip -l sahayak-eb-deploy.zip | head -40
```

Confirm `docker-compose.yml` and `.ebextensions/` appear at the top level, not under a parent folder.

### 6.3 Upload and deploy

Set these to match your resources:

```bash
export AWS_REGION=us-east-1
export EB_APP_NAME=Sahayak
export EB_ENV_NAME=sahayak-prod
export AWS_ACCOUNT_ID="$(aws sts get-caller-identity --query Account --output text --region "$AWS_REGION")"
export EB_BUCKET="elasticbeanstalk-$AWS_REGION-$AWS_ACCOUNT_ID"
export VERSION_LABEL="sahayak-$(date +%Y%m%d-%H%M%S)"
export ZIP_KEY="sahayak/$VERSION_LABEL.zip"
```

Upload ZIP:

```bash
aws s3 cp sahayak-eb-deploy.zip "s3://$EB_BUCKET/$ZIP_KEY" --region "$AWS_REGION"
```

Create EB application version:

```bash
aws elasticbeanstalk create-application-version \
  --application-name "$EB_APP_NAME" \
  --version-label "$VERSION_LABEL" \
  --source-bundle S3Bucket="$EB_BUCKET",S3Key="$ZIP_KEY" \
  --process --region "$AWS_REGION"
```

Deploy and wait:

```bash
aws elasticbeanstalk update-environment \
  --environment-name "$EB_ENV_NAME" \
  --version-label "$VERSION_LABEL" --region "$AWS_REGION"

aws elasticbeanstalk wait environment-updated \
  --environment-names "$EB_ENV_NAME" --region "$AWS_REGION"
```

If the default EB S3 bucket does not exist, initialize Elastic Beanstalk in that region or create a suitable bucket and set `EB_BUCKET` to it.

### 6.4 Verify

```bash
aws elasticbeanstalk describe-environments \
  --application-name "$EB_APP_NAME" \
  --environment-names "$EB_ENV_NAME" \
  --query 'Environments[0].[Status,Health,VersionLabel,CNAME]' \
  --output table --region "$AWS_REGION"
```

Open the returned CNAME and test:

```bash
curl -i "http://YOUR-ENVIRONMENT-CNAME/api/health"
```

Expect HTTP 200 and healthy JSON. Then test registration/login, provider registration, resource listings, emergency requests, and admin provider review. Set up HTTPS/custom domain separately.

## 7. Troubleshooting

View recent EB events:

```bash
aws elasticbeanstalk describe-events \
  --environment-name "$EB_ENV_NAME" --max-items 40 --region "$AWS_REGION"
```

**Backend cannot connect to RDS:** check endpoint, port, DB name, credentials, RDS status, routes, and security-group source. Confirm migrations succeeded.

**Parameter Store access fails:** check exact parameter names, account/region in ARNs, and `ssm:GetParameter` on the EB EC2 instance role. Add `kms:Decrypt` if using a customer-managed KMS key.

**Frontend loads but API returns 502/404:** use the production Compose file; preserve service name `backend`, because Nginx proxies `/api/` to `backend:5000`. Inspect EB events/backend logs.

**Migration fails:** use `npx prisma migrate deploy` for production. Do not use `prisma migrate dev` against production or `docker compose down -v` as a fix.

## 8. Security and cleanup

- Never commit `.env`, `.env.rds`, database dumps, AWS keys, passwords, or secrets.
- Never allow PostgreSQL from `0.0.0.0/0`.
- Use least-privilege IAM policies and a dedicated DB user.
- Review charges for RDS, EC2, Elastic Beanstalk, load balancers, NAT gateways, and storage. Delete test resources only after confirming you no longer need their data.
