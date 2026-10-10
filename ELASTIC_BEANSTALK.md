# Elastic Beanstalk deployment

This repository keeps the existing production deployment and the Elastic Beanstalk configuration side by side.

## Files

- `docker-compose.yaml` remains the existing EC2/production Compose configuration. Do not replace it with the EB configuration.
- `docker-compose.yml` is the Elastic Beanstalk Docker Compose bundle.
- `frontend/nginx.eb.conf` serves the SPA over HTTP and proxies `/api/` to the backend service.
- The frontend Dockerfile uses `nginx.conf` by default; the EB Compose file selects `nginx.eb.conf` with a build argument.

## Required Elastic Beanstalk environment variables

Set these in the Elastic Beanstalk environment configuration. Do not commit secrets:

- `POSTGRES_PASSWORD`: strong alphanumeric password for the Compose PostgreSQL service.
- `JWT_SECRET`: long, random secret.
- `FRONTEND_URL`: the actual frontend/environment URL.
- `JWT_EXPIRES_IN`: optional; defaults to `1d`.
- `AWS_REGION`: optional; defaults to `us-east-1`.
- `S3_VERIFICATION_BUCKET`: optional for this initial configuration. Leave unset only if verification-document uploads are not needed.

## Important production limitations

The Compose PostgreSQL service stores data in a Docker named volume on the EB host. That volume is not a managed, durable database service and can be lost when the host is replaced. **Do not use this database configuration for production user data.** Before production EB deployment, provision and approve a managed database (for example, RDS), configure its connection string, and plan a migration from the current production database.

The application currently uses S3 for provider verification documents. To enable that feature on EB, configure a dedicated/approved bucket and an instance profile with least-privilege access. Do not point test deployments at the production bucket or copy static AWS credentials into environment variables.

This change only adds repository configuration. It does not create or modify AWS resources and does not change the live production stack.
