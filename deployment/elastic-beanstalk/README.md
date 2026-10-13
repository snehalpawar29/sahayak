# Sahayak — AWS Elastic Beanstalk Deployment

This directory contains the production-specific Docker Compose
configuration and Elastic Beanstalk settings for Sahayak.

## Production architecture

- **AWS Elastic Beanstalk:** Runs the application using Docker on
  Amazon Linux 2023.
- **Frontend:** Vite-built frontend served by Nginx on port 80.
- **Backend:** Node.js and Express API listening on port 5000.
- **Database:** Amazon RDS for PostgreSQL. PostgreSQL is managed
  separately and is not run as a Compose service in production.
- **Secrets:** AWS Systems Manager Parameter Store SecureString
  parameters provide `DATABASE_URL` and `JWT_SECRET` to the
  Elastic Beanstalk environment.

Nginx serves the frontend and proxies `/api/` requests to the
backend service.

## Files

- `docker-compose.yml` — production services and networking.
- `.ebextensions/01-secrets.config` — references to the AWS
  Systems Manager parameters used for production secrets.

## Deployment package structure

Elastic Beanstalk must receive a ZIP whose root contains:

- `docker-compose.yml`
- `.ebextensions/01-secrets.config`
- `backend/`
- `frontend/`

The production Compose file in this directory is separate from the
root `docker-compose.yml`, which is used for local development.

To prepare a production bundle, assemble the production Compose file,
the `.ebextensions/` directory, and the required backend and frontend
source directories at the ZIP root. Do not include `.env` files,
database dumps, local dependencies, or credentials.

## Required AWS configuration

Before deploying to another AWS account or region:

1. Create the required RDS PostgreSQL database and networking.
2. Create SecureString parameters for `DATABASE_URL` and `JWT_SECRET`.
3. Update the parameter ARNs in `.ebextensions/01-secrets.config`
   for the target account and region.
4. Ensure the Elastic Beanstalk EC2 instance profile can read those
   parameters and decrypt them when a customer-managed KMS key is used.
5. Verify the environment's database connectivity and security groups.
6. Deploy a new application version and verify environment health
   and application functionality.

Never commit secret values, passwords, private keys, or `.env` files.
