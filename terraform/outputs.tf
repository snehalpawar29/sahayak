output "aws_region" {
  description = "AWS region used for Sahayak"
  value       = var.aws_region
}

output "vpc_id" {
  description = "Sahayak VPC ID"
  value       = aws_vpc.main.id
}

output "public_subnet_ids" {
  description = "Public subnet IDs"
  value       = aws_subnet.public[*].id
}

output "private_subnet_ids" {
  description = "Private subnet IDs"
  value       = aws_subnet.private[*].id
}

output "elastic_beanstalk_application_name" {
  description = "Elastic Beanstalk application name"
  value       = aws_elastic_beanstalk_application.main.name
}

output "elastic_beanstalk_environment_name" {
  description = "Elastic Beanstalk environment name"
  value       = aws_elastic_beanstalk_environment.main.name
}

output "elastic_beanstalk_url" {
  description = "Public environment URL"
  value       = "http://${aws_elastic_beanstalk_environment.main.cname}"
}

output "deployment_bucket_name" {
  description = "Private S3 bucket used for deployment bundles"
  value       = aws_s3_bucket.deployment.bucket
}